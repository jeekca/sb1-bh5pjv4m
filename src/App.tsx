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
      
      // Generate image using FAL AI
      generateImageWithFal(value.trim(), newLoadingDesign.id);
    }
  };

  // FAL AI image generation function
  const generateImageWithFal = (userPrompt: string, designId: string, options?: any) => {
    // 1. Define the parameters for the Fal.ai call.
    //    We can merge default values with user-provided options.
    const defaultParams = {
      prompt: userPrompt,
      image_size: "landscape_16_9",
      seed: Math.floor(Math.random() * 1000000), // Add a random seed
      num_images: 1,
    };

    const params = { ...defaultParams, ...options };

    // 2. Use URLSearchParams to build a safe query string.
    //    This automatically handles encoding of all values.
    const query = new URLSearchParams(params).toString();
    const url = `/api/proxy?${query}`;

    console.log(`Connecting to proxy with URL: ${url}`);

    // A reference to an existing EventSource, if any, to close it before starting a new one.
    let eventSource: EventSource | null = null;

    // Cleanup function to close the connection
    const closeConnection = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log("SSE Connection Closed.");
      }
    };

    // 3. Create the EventSource and add listeners
    eventSource = new EventSource(url);

    // Listener for 'status' events
    eventSource.addEventListener('status', (event) => {
      const data = JSON.parse(event.data);
      console.log(`STATUS UPDATE: ${data.status}`);
      // Update your UI here
    });

    // Listener for 'log' events
    eventSource.addEventListener('log', (event) => {
      const data = JSON.parse(event.data);
      console.log(`LOG: ${data.message}`);
      // Update your UI here
    });

    // Listener for the final 'result' event
    eventSource.addEventListener('result', (event) => {
      const result = JSON.parse(event.data);
      console.log("FINAL RESULT RECEIVED:", result);
      
      // Use the result in your Three.js scene...
      const imageUrl = result.data?.images?.[0]?.url;
      
      if (imageUrl) {
        // Update the design with the generated image
        setDesigns(prevDesigns => 
          prevDesigns.map(design => 
            design.id === designId 
              ? { 
                  ...design, 
                  isLoading: false,
                  imageUrl: imageUrl
                }
              : design
          )
        );
        
        // Apply the generated texture to the golf ball
        setTextureUrl(imageUrl);
        
        console.log("Generated image applied to golf ball:", imageUrl);
      } else {
        console.error("No image URL found in result:", result);
        // Update design to show error state
        setDesigns(prevDesigns => 
          prevDesigns.map(design => 
            design.id === designId 
              ? { 
                  ...design, 
                  isLoading: false,
                  imageUrl: '/tex-default-preview.png' // Fallback to default
                }
              : design
          )
        );
      }

      // The process is complete, so we close the connection.
      closeConnection();
    });

    // Handle any errors with the connection
    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      
      // Update design to show error state
      setDesigns(prevDesigns => 
        prevDesigns.map(design => 
          design.id === designId 
            ? { 
                ...design, 
                isLoading: false,
                imageUrl: '/tex-default-preview.png' // Fallback to default
              }
            : design
        )
      );
      
      // An error automatically closes the connection, but we ensure it's cleaned up.
      closeConnection();
    };
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