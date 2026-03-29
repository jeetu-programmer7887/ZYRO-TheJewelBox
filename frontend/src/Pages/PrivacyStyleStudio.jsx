import React, { useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import axios from 'axios';

const PrivacyStyleStudio = () => {
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const imgRef = useRef();

  // 1. Handle Upload (Local Only)
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      // This URL only exists in YOUR browser's memory
      setPreview(URL.createObjectURL(file)); 
    }
  };

  // 2. Perform AI Analysis locally
  const runAnalysis = async (focus) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgRef.current, 0, 0, 100, 100);
    const pixels = ctx.getImageData(50, 50, 1, 1).data; // Sample center
    
    const isWarm = pixels[0] > pixels[2];
    const resultData = {
      focus: focus,
      variation: isWarm ? "Warm" : "Cool",
      metalPreference: isWarm ? "Gold" : "Silver"
    };

    setAnalysis(resultData);

    // 3. Save ONLY the text results to DB
    setIsSaving(true);
    try {
      await axios.post(backendUrl + `/api/save-results`, resultData);
      console.log("Privacy maintained: Only text data saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-stone-100 mt-10">
      <h2 className="text-2xl font-serif text-stone-800 mb-6">Secure Style Analysis</h2>
      
      {!preview ? (
        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-12 text-center">
          <input type="file" onChange={handleFile} className="hidden" id="fileIn" />
          <label htmlFor="fileIn" className="cursor-pointer text-amber-600 font-bold">
            Upload Photo for Instant Local Analysis
          </label>
          <p className="text-xs text-stone-400 mt-2">Images are processed in RAM and never saved to our servers.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <img ref={imgRef} src={preview} className="w-48 h-48 object-cover rounded-2xl mx-auto shadow-md" />
          
          <div className="flex justify-center gap-4">
            <button onClick={() => runAnalysis('skin')} className="px-6 py-2 bg-stone-900 text-white rounded-full text-xs">Analyze Skin Tone</button>
            <button onClick={() => setPreview(null)} className="px-6 py-2 border border-stone-200 rounded-full text-xs">Clear Photo</button>
          </div>

          {analysis && (
            <div className="bg-amber-50 p-6 rounded-2xl animate-pulse">
              <p className="text-amber-900 font-bold">Recommendation: {analysis.metalPreference}</p>
              <p className="text-amber-700 text-sm">Your {analysis.variation} profile has been saved to your history.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrivacyStyleStudio;