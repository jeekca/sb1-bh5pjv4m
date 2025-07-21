// src/App.tsx

import React, { useState } from 'react';
import ModelViewer from './components/ModelViewer';
import FileUploader from './components/FileUploader';
import AITextInput from './components/AITextInput';
import DesignsSection from './components/DesignsSection';

interface Design {
  id: string;
  imageUrl: string;
  title: string;
}

const App: React.FC = () => {
  // State to hold the temporary URL of the uploaded texture
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  // A simple handler for the file itself (optional, but good practice)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // State for designs list
  const [designs, setDesigns] = useState<Design[]>([]);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    
    // Add new design to the top of the list (prepend)
    const newDesign: Design = {
      id: Date.now().toString(),
      imageUrl: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
    };
    
    setDesigns(prevDesigns => [newDesign, ...prevDesigns]);
    console.log("Uploaded file:", file.name);
  };

  // This function will receive the texture URL from the FileUploader
  // and update the state, triggering the change in ModelViewer.
  const handleTextureUpdate = (url: string) => {
    setTextureUrl(url);
  };

  const handleTextInputChange = (value: string) => {
    console.log('AI Text Input:', value);
    // You can add logic here to process the AI text input
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

      {/* AI Text Input Field */}
      <AITextInput onInputChange={handleTextInputChange} />

      {/* Designs Section */}
      <DesignsSection designs={designs} />
    </div>
  );
};

export default App;