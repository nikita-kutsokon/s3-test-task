# Media Management Service

## Overview

This is a simple Node.js application (without Express) that provides a media management service. It allows users to upload, retrieve, update, and delete media files stored in an AWS S3-compatible storage (e.g., MinIO). The application also maintains metadata about uploaded files and validates file types.

---

## Features

1. **Custom HTTP Server**:

   - Implements a basic router to handle API endpoints.
   - Supports HTTP methods: `GET`, `POST`, `PUT`, `DELETE`.

2. **Media Operations**:

   - **Create**: Upload media files to AWS S3.
   - **Read**: Retrieve media files from S3.
   - **Update**: Replace existing media files.
   - **Delete**: Remove media files from S3.

3. **AWS S3 Integration**:

   - Uses AWS SDK to interact with S3-compatible storage.
   - Handles large file uploads efficiently.
   - Provides progress tracking for uploads.

4. **Basic Features**:
   - Stores metadata about uploaded files in a local `metadata.json` file.
   - Validates file types (`image/jpeg`, `image/png`, `application/pdf`).
   - Includes simple logging for debugging and monitoring.

---

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Docker (for running MinIO)
- AWS CLI (optional, for testing S3 operations)

### Steps

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd file-uploader
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory and add the following:

   ```
   AWS_REGION=us-east-1
   BUCKET_NAME=file-uploader-bucket
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin
   ```

3. **Start MinIO (S3-Compatible Storage)**
   Use the provided docker-compose.yaml file to start MinIO:

   ```bash
   docker-compose up -d
   ```

4. **Create the S3 Bucket**
   After starting MinIO, create the bucket using the AWS CLI:
   ```bash
   aws --endpoint-url http://localhost:9000 s3 mb s3://file-uploader-bucket
   ```
   Or use the MinIO UI by navigating to http://localhost:9000 with the credentials specified in your `.env` file.

---

## API Endpoints

1. **Upload a File**

   - **Endpoint**: `POST /media`
   - **Description**: Uploads a file to S3.
   - **Request**:
     - Content-Type: `multipart/form-data`
     - Form field: `file`
   - **Response**:
     ```json
     {
       "id": "<file-id>",
       "url": "<file-url>"
     }
     ```
   - **Example**:
     ```bash
     curl -X POST http://localhost:3000/media \
       --form 'file=@/path/to/your/file.png'
     ```

2. **Retrieve a File**

   - **Endpoint**: `GET /media/:id`
   - **Description**: Retrieves a file from S3 by its id.
   - **Response**: The file is streamed to the client.
   - **Example**:
     ```bash
     curl -X GET http://localhost:3000/media/<file-id> --output downloaded-file.png
     ```

3. **Update a File**

   - **Endpoint**: `PUT /media/:id`
   - **Description**: Replaces an existing file in S3.
   - **Request**:
     - Content-Type: `multipart/form-data`
     - Form field: `file`
   - **Response**:
     ```json
     {
       "id": "<file-id>",
       "url": "<file-url>"
     }
     ```
   - **Example**:
     ```bash
     curl -X PUT http://localhost:3000/media/<file-id> \
       --form 'file=@/path/to/new-file.png'
     ```

4. **Delete a File**
   - **Endpoint**: `DELETE /media/:id`
   - **Description**: Deletes a file from S3 and removes its metadata.
   - **Example**:
     ```bash
     curl -X DELETE http://localhost:3000/media/<file-id>
     ```

All metadata about files is saved in the `metadata.json` file in the root of the project.
