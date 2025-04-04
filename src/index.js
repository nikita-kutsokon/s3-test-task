const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const Busboy = require('busboy');

dotenv.config();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.MINIO_ROOT_USER,
  secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
  endpoint: 'http://minio:9000',
  s3ForcePathStyle: true
});

const BUCKET_NAME = process.env.BUCKET_NAME;
const METADATA_FILE = './metadata.json';

const loadMetadata = () => {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      return data ? JSON.parse(data) : {};
    } catch (err) {
      log(`Failed to load metadata: ${err}`);
      return {};
    }
  }
  return {};
};

const saveMetadata = metadata => {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
};

const log = message => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const handleError = (res, statusCode, message, error) => {
  log(`${message}: ${error}`);

  res.writeHead(statusCode);
  res.end(message);
};

const handleUpload = (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  const metadata = loadMetadata();

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(mimetype)) {
      return handleError(res, 400, 'Invalid file type');
    }

    const uniqueKey = `${crypto.randomUUID()}`;
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: uniqueKey,
      Body: file,
      ContentType: mimetype
    };

    s3.upload(uploadParams)
      .on('httpUploadProgress', progress => {
        log(`Upload progress: ${progress.loaded} / ${progress.total}`);
      })
      .send((err, data) => {
        if (err) return handleError(res, 500, 'Upload failed', err);

        metadata[uniqueKey] = { filename, mimetype, uploadedAt: new Date().toISOString() };
        saveMetadata(metadata);
        console.log(metadata);

        log(`File uploaded successfully: ${data.Location}`);
        sendJson(res, 201, { id: uniqueKey, url: data.Location });
      });
  });

  busboy.on('error', err => handleError(res, 500, 'Busboy Error', err));
  req.pipe(busboy);
};

const handleGet = async (req, res, id) => {
  const metadata = loadMetadata();
  if (!metadata[id]) return handleError(res, 404, 'File not found');

  try {
    const getParams = { Bucket: BUCKET_NAME, Key: id };
    const stream = s3.getObject(getParams).createReadStream();
    stream.on('error', err => handleError(res, 404, 'S3 Get Error', err));
    stream.pipe(res);
  } catch (err) {
    handleError(res, 500, 'Failed to retrieve file', err);
  }
};

const handleUpdate = (req, res, id) => {
  const metadata = loadMetadata();
  if (!metadata[id]) return handleError(res, 404, 'File not found');

  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: id,
      Body: file,
      ContentType: mimetype
    };

    s3.upload(uploadParams)
      .on('httpUploadProgress', progress => {
        log(`Update progress: ${progress.loaded} / ${progress.total}`);
      })
      .send((err, data) => {
        if (err) return handleError(res, 500, 'Update failed', err);

        metadata[id] = { filename, mimetype, updatedAt: new Date().toISOString() };
        saveMetadata(metadata);

        log(`File updated successfully: ${data.Location}`);
        sendJson(res, 200, { id, url: data.Location });
      });
  });

  req.pipe(busboy);
};

const handleDelete = async (req, res, id) => {
  const metadata = loadMetadata();
  if (!metadata[id]) return handleError(res, 404, 'File not found');

  try {
    const deleteParams = { Bucket: BUCKET_NAME, Key: id };

    await new Promise((resolve, reject) => {
      s3.deleteObject(deleteParams, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    delete metadata[id];
    saveMetadata(metadata);

    log(`File deleted successfully: ${id}`);
    res.writeHead(200);
    res.end('File deleted');
  } catch (err) {
    handleError(res, 500, 'Delete failed', err);
  }
};

const route = (req, res) => {
  const method = req.method;
  const [_, resource, id] = req.url.split('/');

  if (resource === 'media') {
    if (method === 'POST') return handleUpload(req, res);
    if (method === 'GET' && id) return handleGet(req, res, id);
    if (method === 'PUT' && id) return handleUpdate(req, res, id);
    if (method === 'DELETE' && id) return handleDelete(req, res, id);
  }

  handleError(res, 404, 'Not Found');
};

const server = http.createServer(route);
server.listen(3000, () => log('Server listening on port 3000'));
