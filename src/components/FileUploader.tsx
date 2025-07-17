import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  onTextureUpdate: (textureUrl: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, onTextureUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/png') {
      // Create a URL for the uploaded file
      const textureUrl = URL.createObjectURL(file);
      
      // Call both callbacks
      onFileUpload(file);
      onTextureUpdate(textureUrl);
    } else {
      alert('Please select a PNG file.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed bottom-6 right-6 z-10">
      <button
        onClick={handleClick}
        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
      >
        <Upload size={24} />
        <span className="hidden sm:inline">Upload PNG</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUploader;