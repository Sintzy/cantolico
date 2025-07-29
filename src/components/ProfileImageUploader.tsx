"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

type Props = {
  userId: number;
  currentImage?: string | null;
  onUpload: (newImageUrl: string) => void;
};

export default function ProfileImageUploader({ userId, currentImage, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // comprimir
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });

      // Upload pro Supabase
      const filePath = `avatars/${userId}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (data?.publicUrl) {
        onUpload(data.publicUrl);
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 cursor-pointer group">
      <Image
        src={currentImage || "/default-profile.png"}
        alt="Imagem de perfil"
        fill
        className="object-cover"
        onClick={handleImageClick}
      />
      {uploading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm text-gray-600">
          Enviando...
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      <div className="absolute bottom-0 w-full text-center bg-black/40 text-white text-xs py-1 opacity-0 group-hover:opacity-100 transition">
        Alterar foto
      </div>
    </div>
  );
}
