// src/App.tsx

import React, { useState, useEffect } from 'react';
import ModelViewer from './components/ModelViewer';
import FileUploader from './components/FileUploader';
import AITextInput from './components/AITextInput';
import DesignsSection from './components/DesignsSection';

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  isLoading?: boolean;
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
    
    // Only add design when called from file upload (not from text input)
    if (file) {
      const newDesign: Design = {
        id: Date.now().toString(),
        imageUrl: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        isLoading: false
      };
      
      setDesigns(prevDesigns => [newDesign, ...prevDesigns]);
    }
    console.log("Uploaded file:", file.name);
  };

  // This function will receive the texture URL from the FileUploader
  // and update the state, triggering the change in ModelViewer.
  const handleTextureUpdate = (url: string) => {
    setTextureUrl(url);
  };

  // Handle Enter key press from AI text input
  const handleTextInputSubmit = (value: string) => {
    if (value.trim()) {
      console.log('AI Text Input submitted:', value);
      
      // Add new loading design to the top of the list
      const newLoadingDesign: Design = {
        id: `loading-${Date.now()}`,
        imageUrl: '',
        title: value.trim(),
        isLoading: true
      };
      
      setDesigns(prevDesigns => [newLoadingDesign, ...prevDesigns]);
      
      // Simulate design generation completion after 3-5 seconds
      setTimeout(() => {
        setDesigns(prevDesigns => 
          prevDesigns.map(design => 
            design.id === newLoadingDesign.id 
              ? { 
                  ...design, 
                  isLoading: false,
                  imageUrl: '/tex-default-preview.png' // Use default preview as placeholder
                }
              : design
          )
        );
      }, Math.random() * 2000 + 3000); // Random delay between 3-5 seconds
    }
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
      <AITextInput onInputSubmit={handleTextInputSubmit} />

      {/* Designs Section */}
      <DesignsSection designs={designs} />
    </div>
  );
};

export default App;