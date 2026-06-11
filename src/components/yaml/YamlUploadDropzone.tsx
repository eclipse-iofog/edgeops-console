import React, { useCallback, useRef, useState } from "react";
import { CloudUpload as CloudUploadRounded } from "lucide-react";

type Props = {
  onUpload?: (file: File) => void;
};

const YamlUploadDropzone: React.FC<Props> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith(".yaml") && !file.name.endsWith(".yml")) {
        alert("Only YAML files are allowed");
        return;
      }
      if (onUpload) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        ml-2 w-full sm:w-auto
        flex flex-col sm:flex-row items-center justify-center
        border-2 border-dashed rounded-md
        px-4 py-3 sm:py-2 sm:px-4
        cursor-pointer text-center
        transition-colors
        ${isDragging ? "border-blue-300 bg-blue-50" : "border-gray-600 bg-gray-800"}
      `}
    >
      <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-400 text-sm text-center">
        <CloudUploadRounded fontSize="small" className="text-white" />
        <span className="text-white">
          Drag YAML here or{" "}
          <span className="underline text-blue-300">upload</span>
        </span>
      </div>
      <input
        type="file"
        accept=".yaml,.yml"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};

export default YamlUploadDropzone;
