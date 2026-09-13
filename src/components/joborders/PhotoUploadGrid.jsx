import React, { useRef } from "react";
import { api } from "@/api/firebaseClient";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from "@/lib/icons";
import { useState } from "react";

export default function PhotoUploadGrid({ photos = [], onChange, label = "Photos", slots = [] }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    setUploading(true);
    const results = [];
    for (const file of Array.from(files)) {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      results.push({ url: file_url, label: "" });
    }
    onChange([...photos, ...results]);
    setUploading(false);
  };

  const removePhoto = (idx) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  const updateLabel = (idx, lbl) => {
    const updated = [...photos];
    updated[idx] = { ...updated[idx], label: lbl };
    onChange(updated);
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {slots.map(s => (
            <span key={s} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, idx) => (
          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            <img src={p.url} alt={p.label || `photo-${idx+1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="bg-red-500 rounded-full p-1"
              ><X className="h-3 w-3 text-white" /></button>
            </div>
            <input
              className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 w-full"
              value={p.label}
              onChange={e => updateLabel(idx, e.target.value)}
              placeholder="label..."
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-[10px]">Add Photo</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}