import React, { useRef, useState } from "react";
import { api } from "@/api/firebaseClient";
import { Camera, X, Loader2 } from "@/lib/icons";

// Works on a flat array of image URLs (matches business.photos' existing
// shape — the branch page just does photos.map(src => <img src={src} />)),
// unlike PhotoUploadGrid's { url, label } objects used for job-order photos.
export default function BranchPhotoEditor({ photos = [], onChange, max = 8 }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files)
          .slice(0, Math.max(0, max - photos.length))
          .map((file) => api.integrations.Core.UploadFile({ file }))
      );
      onChange([...photos, ...uploads.map((u) => u.file_url)]);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) => onChange(photos.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((src, idx) => (
          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
            <img src={src} alt={`photo-${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-[10px]">Add</span></>}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
      />
      <p className="text-xs text-slate-400 mt-1.5">{photos.length}/{max} photos - shown on the branch's public page</p>
    </div>
  );
}
