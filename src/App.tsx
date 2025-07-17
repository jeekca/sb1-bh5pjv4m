import React, { useState } from 'react';
import ModelViewer from './components/ModelViewer';
import FileUploader from './components/FileUploader';

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentTexture, setCurrentTexture] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded:', file.name);

    // Auto-dismiss notification after 3 seconds
    setTimeout(() => {
      setUploadedFile(null);
    }, 3000);
  };

  const handleTextureUpdate = (textureUrl: string) => {
    setCurrentTexture(textureUrl);
    console.log('Texture updated:', textureUrl);
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      <ModelViewer
        onFileUpload={handleFileUpload}
        uploadedTexture={currentTexture}
      />
      <FileUploader
        onFileUpload={handleFileUpload}
        onTextureUpdate={handleTextureUpdate}
      />

      {uploadedFile && (
        <div className="fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg">
          <p className="text-sm">Texture Updated: {uploadedFile.name}</p>
        </div>
      )}
    </div>
  );
}

export default App;
