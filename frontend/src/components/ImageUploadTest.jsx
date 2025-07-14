import React, { useState } from 'react';
import { Upload, Button, message, Card, Typography } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import uploadService from '../services/uploadService';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ImageUploadTest = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadService.uploadImage(formData);
      
      setUploadedImages(prev => [...prev, response.data]);
      message.success('Image uploaded successfully!');
    } catch (error) {
      message.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  const uploadProps = {
    beforeUpload: handleUpload,
    showUploadList: false,
    accept: 'image/*',
    multiple: false
  };

  return (
    <Card title="Image Upload Test" style={{ margin: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Title level={4}>Upload Test</Title>
        <Text type="secondary">
          Test the image upload functionality. Images will be automatically processed and converted to WebP format.
        </Text>
      </div>

      <Dragger {...uploadProps} style={{ marginBottom: '20px' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag image to this area to upload</p>
        <p className="ant-upload-hint">
          Support for single image upload. Images will be automatically resized and optimized.
        </p>
      </Dragger>

      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? 'Uploading...' : 'Select Image'}
        </Button>
      </Upload>

      {uploadedImages.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <Title level={5}>Uploaded Images:</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {uploadedImages.map((image, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <img 
                  src={image.thumbnailUrl} 
                  alt={`Uploaded ${index}`}
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9'
                  }}
                />
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <div>{image.filename}</div>
                  <a href={image.url} target="_blank" rel="noopener noreferrer">
                    View Full Size
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ImageUploadTest;
