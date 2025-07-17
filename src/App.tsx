// src/App.tsx

import React, { useState } from 'react';
import ModelViewer from './components/ModelViewer';
import FileUploader from './components/FileUploader';

const App: React.FC = () => {
  // State to hold the temporary URL of the uploaded texture
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  // A simple handler for the file itself (optional, but good practice)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("Uploaded file:", file.name);
  };

  // This function will receive the texture URL from the FileUploader
  // and update the state, triggering the change in ModelViewer.
  const handleTextureUpdate = (url: string) => {
    setTextureUrl(url);
  };

  return (
    <div className="App">
      {/* 
        The ModelViewer receives the textureUrl. Its useEffect hook will
        detect when this prop changes and update the material.
      */}
      <ModelViewer 
        onFileUpload={handleFileUpload} 
        uploadedTexture={textureUrl} 
      />

      {/* 
        The FileUploader receives the callback functions. When a file
        is uploaded, it will call onTextureUpdate with the new URL.
      */}
      <FileUploader
        onFileUpload={handleFileUpload}
        onTextureUpdate={handleTextureUpdate}
      />
    </div>
  );
};

export default App;