import { NextResponse, NextRequest } from "next/server";
import { withUserProtection } from "@/lib/enhanced-api-protection";
import { supabase } from "@/lib/supabase-client";
import { randomUUID } from "crypto";
import {
  Instrument,
  LiturgicalMoment,
  SongType,
  SourceType,
} from "@/lib/constants";
import { formatTagsForPostgreSQL, getClientIP } from "@/lib/utils";
import { FileType } from "@/types/song-files";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/types/logging";


async function uploadToSupabase(
  path: string,
  file: Buffer | string,
  contentType: string
): Promise<string | null> {
  const { error } = await supabase.storage.from("songs").upload(path, file, {
    contentType,
  });
  if (error) {
    console.error(`Erro ao enviar arquivo para o Supabase: ${error.message}`);
    return null;
  }
  return path;
}

async function validateTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Erro ao validar Turnstile token:', error);
    return false;
  }
}

export const POST = withUserProtection<any>(async (req: NextRequest, session: any) => {
  const clientIp = getClientIP(req.headers);
  const startTime = Date.now();
  
  console.log('🎵 Nova submissão de música iniciada');

  logger.info('Music submission started', {
    category: LogCategory.SUBMISSION,
    user: { id: session.user.id, email: session.user.email, role: session.user.role },
    network: { ip_address: clientIp },
    http: { method: 'POST', url: '/api/musics/create' }
  });

  const { data: user, error: userError } = await supabase
    .from('User')
    .select('id, email')
    .eq('email', session.user.email)
    .single();

  if (userError || !user) {
    logger.error('User not found for submission', {
      category: LogCategory.SUBMISSION,
      user: { email: session.user.email },
      network: { ip_address: clientIp },
      error: { error_message: userError?.message }
    });
    console.error("Erro: Utilizador não encontrado.");
    return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
  }

  console.log(`🎵 [SONG SUBMIT] User ${user.email} submitting new song`);

    const formData = await req.formData();
    console.log("FormData recebido:", formData);

    // Validar Turnstile captcha
    const captchaToken = formData.get("captchaToken")?.toString();
    if (!captchaToken) {
      return NextResponse.json({ error: "Token do captcha é obrigatório" }, { status: 400 });
    }

    const isValidCaptcha = await validateTurnstileToken(captchaToken);
    if (!isValidCaptcha) {
      return NextResponse.json({ error: "Captcha inválido. Tente novamente." }, { status: 400 });
    }

    const title = formData.get("title")?.toString() ?? "";
    const author = formData.get("author")?.toString() || null;
    // O DB usa enum 'ACORDES' | 'PARTITURA'.
    // O frontend pode enviar labels ('Acordes'/'Partitura') ou os valores do enum legado ('ACORDES'/'PARTITURA').
    const rawType = formData.get("type")?.toString() ?? "";
    const typeMap: Record<string, string> = {
      // UI labels (constants.ts)
      [SongType.ACORDES]: "ACORDES",
      [SongType.PARTITURA]: "PARTITURA",
      // legacy
      ACORDES: "ACORDES",
      PARTITURA: "PARTITURA",
    };
    const type = (typeMap[rawType] || rawType.toUpperCase()) as unknown as SongType;
    const instrumentRaw = formData.get("instrument")?.toString() ?? "";
    
    // Convert instrument from Portuguese label to database enum value
    const instrumentMap: Record<string, string> = {
      "Guitarra": "GUITARRA",
      "Piano": "PIANO",
      "Órgão": "ORGAO",
      "Coro": "CORO",
      "Outro": "OUTRO",
    };
    
    const instrument = (instrumentMap[instrumentRaw] || instrumentRaw.toUpperCase()) as Instrument;
    
    const markdown = formData.get("markdown")?.toString() ?? "";

    const tagString = formData.get("tags")?.toString() ?? "";
    const momentsRaw = formData.get("moments")?.toString() ?? "[]";

    // Processar tags usando a função utilitária
    const tags = formatTagsForPostgreSQL(
      tagString
        .replace(/[{}]/g, '') // Remove chaves se existirem
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    );

    // Convert moments from Portuguese labels to database enum values
    const momentMap: Record<string, string> = {
      "Entrada": "ENTRADA",
      "Ato Penitencial": "ATO_PENITENCIAL",
      "Glória": "GLORIA",
      "Salmo": "SALMO",
      "Aclamação": "ACLAMACAO",
      "Ofertório": "OFERTORIO",
      "Santo": "SANTO",
      "Comunhão": "COMUNHAO",
      "Ação de Graças": "ACAO_DE_GRACAS",
      "Final": "FINAL",
      "Adoração": "ADORACAO",
      "Aspersão": "ASPERSAO",
      "Baptismo": "BAPTISMO",
      "Bênção das Alianças": "BENCAO_DAS_ALIANCAS",
      "Cordeiro de Deus": "CORDEIRO_DE_DEUS",
      "Crisma": "CRISMA",
      "Introdução da Palavra": "INTRODUCAO_DA_PALAVRA",
      "Louvor": "LOUVOR",
      "Pai Nosso": "PAI_NOSSO",
      "Reflexão": "REFLEXAO",
      "Terço Mistério": "TERCO_MISTERIO",
      "Outros": "OUTROS",
    };

    let moments: LiturgicalMoment[] = [];
    try {
      const parsed = JSON.parse(momentsRaw);
      if (Array.isArray(parsed)) {
        moments = parsed.map(m => momentMap[m] || m) as LiturgicalMoment[];
      }
    } catch (error) {
      console.error("Erro ao analisar momentos:", error);
      return NextResponse.json({ error: "Momentos inválidos" }, { status: 400 });
    }

    const pdfFile = formData.get("pdf") as File | null;
    const audioFile = formData.get("audio") as File | null;

    // Novo sistema de ficheiros: processar array de ficheiros com descrições
    const filesJson = formData.get("files")?.toString();
    let filesData: Array<{fileType: FileType, fileName: string, description: string, file: File, fileBuffer: Buffer}> = [];
    
    if (filesJson) {
      try {
        const parsedFiles = JSON.parse(filesJson);
        filesData = await Promise.all(
          parsedFiles.map(async (f: any, index: number) => {
            const file = formData.get(`file_${index}`) as File;
            if (!file) return null;

            // Validação rigorosa de ficheiros (anti-XSS)
            const isPdf = f.fileType === 'PDF';
            const isAudio = f.fileType === 'AUDIO';

            const fileBuffer = Buffer.from(await file.arrayBuffer());

            if (isPdf) {
              // Verificar PDF magic bytes
              const pdfMagic = fileBuffer.slice(0, 5).toString('ascii');
              if (pdfMagic !== '%PDF-') {
                console.error(`Ficheiro ${file.name} rejeitado: não é um PDF válido`);
                return null;
              }
            }

            if (isAudio) {
              // Verificar magic bytes de áudio
              let isValidAudio = false;
              if ((fileBuffer[0] === 0x49 && fileBuffer[1] === 0x44 && fileBuffer[2] === 0x33) ||
                  (fileBuffer[0] === 0xFF && (fileBuffer[1] === 0xFB || fileBuffer[1] === 0xF3 || fileBuffer[1] === 0xF2)) ||
                  (fileBuffer[0] === 0x52 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46 && fileBuffer[3] === 0x46) ||
                  (fileBuffer[0] === 0x4F && fileBuffer[1] === 0x67 && fileBuffer[2] === 0x67 && fileBuffer[3] === 0x53) ||
                  (fileBuffer[4] === 0x66 && fileBuffer[5] === 0x74 && fileBuffer[6] === 0x79 && fileBuffer[7] === 0x70)) {
                isValidAudio = true;
              }
              
              if (!isValidAudio) {
                console.error(`Ficheiro ${file.name} rejeitado: não é um áudio válido`);
                return null;
              }
            }

            return {
              fileType: f.fileType,
              fileName: f.fileName,
              description: f.description,
              file: file,
              fileBuffer: fileBuffer
            };
          })
        );
        
        // Filtrar nulls (ficheiros inválidos)
        filesData = filesData.filter((f): f is NonNullable<typeof f> => f !== null);
        
      } catch (error) {
        console.error("Erro ao processar ficheiros:", error);
      }
    }

    const spotifyLink = formData.get("spotifyLink")?.toString() ?? null;
    const youtubeLink = formData.get("youtubeLink")?.toString() ?? null;

    const submissionId = randomUUID(); 
    const uploaderId = user.id;
    let pdfPath: string | null = null;
    let audioPath: string | null = null;
    let markdownPath: string | null = null;

    console.log("Dados recebidos:", {
      title,
      type,
      instrument,
      markdown,
      tags,
      moments,
      pdfFile,
      audioFile,
      spotifyLink,
      youtubeLink,
      submissionId,
    });

  if (pdfFile) {
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const path = `songs/${submissionId}/sheet.pdf`; 
    
    pdfPath = await uploadToSupabase(path, buffer, "application/pdf");
    if (!pdfPath) {
      console.error("Erro ao enviar PDF.");
      return NextResponse.json({ error: "Erro ao enviar PDF" }, { status: 500 });
    }
  }

  if (audioFile) {
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const path = `songs/${submissionId}/audio.mp3`; 
    
    audioPath = await uploadToSupabase(path, buffer, "audio/mpeg");
    if (!audioPath) {
      console.error("Erro ao enviar áudio.");
      return NextResponse.json({ error: "Erro ao enviar áudio" }, { status: 500 });
    }
  }

  if (markdown) {
    const path = `songs/${submissionId}/${submissionId}.md`; 
    markdownPath = await uploadToSupabase(path, markdown, "text/markdown");
    if (!markdownPath) {
      console.error("Erro ao enviar markdown.");
      return NextResponse.json({ error: "Erro ao enviar markdown" }, { status: 500 });
    }
  }

  const { data: submission, error: submissionError } = await supabase
    .from('SongSubmission')
    .insert({
      id: submissionId,
      title,
      author,
      moment: moments,
      type,
      mainInstrument: instrument,
      tags,
      submitterId: uploaderId,
      status: "PENDING",
      tempSourceType: markdown ? "MARKDOWN" : "PDF",
      tempPdfKey: pdfPath || null,
      tempText: markdown || null,
      mediaUrl: audioPath || null,
      spotifyLink,
      youtubeLink,
    })
    .select()
    .single();

  if (submissionError || !submission) {
    throw new Error(`Supabase error: ${submissionError?.message}`);
  }

  // Processar e guardar novos ficheiros com descrições
  if (filesData.length > 0) {
    console.log(`📁 Processando ${filesData.length} ficheiros validados...`);
    
    logger.info('Processing submission files', {
      category: LogCategory.UPLOAD,
      user: { id: user.id, email: user.email },
      network: { ip_address: clientIp },
      domain: { submission_id: submissionId },
      details: {
        file_count: filesData.length,
        pdf_count: filesData.filter(f => f.fileType === FileType.PDF).length,
        audio_count: filesData.filter(f => f.fileType === FileType.AUDIO).length
      }
    });
    
    let uploadedCount = 0;
    let failedCount = 0;
    const fileMetadata: Record<string, { fileName: string; fileType: string; description: string }> = {};
    
    for (const fileData of filesData) {
      if (!fileData.fileBuffer) continue;
      
      // Usar buffer já validado
      const fileExtension = fileData.fileName.split('.').pop();
      const uniqueFileName = `${randomUUID()}.${fileExtension}`;
      const storagePath = `songs/${submissionId}/${uniqueFileName}`;
      
      logger.info('Uploading submission file', {
        category: LogCategory.UPLOAD,
        user: { id: user.id, email: user.email },
        network: { ip_address: clientIp },
        domain: { submission_id: submissionId },
        details: {
          file_name: fileData.fileName,
          file_type: fileData.fileType,
          file_size: fileData.file.size,
          storage_path: storagePath,
          description: fileData.description
        }
      });
      
      // Upload para Storage usando buffer já validado
      const uploadSuccess = await uploadToSupabase(
        storagePath, 
        fileData.fileBuffer, 
        fileData.file.type
      );
      
      if (uploadSuccess) {
        uploadedCount++;
        
        // Guardar metadados da descrição
        fileMetadata[uniqueFileName] = {
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          description: fileData.description || ''
        };
        
        logger.success('Submission file uploaded', {
          category: LogCategory.UPLOAD,
          user: { id: user.id, email: user.email },
          network: { ip_address: clientIp },
          domain: { submission_id: submissionId },
          details: {
            file_name: fileData.fileName,
            file_type: fileData.fileType,
            storage_path: storagePath,
            description: fileData.description
          },
          tags: ['submission-file', fileData.fileType.toLowerCase()]
        });
        console.log(`✅ Ficheiro guardado: ${fileData.fileName}`);
      } else {
        failedCount++;
        logger.error('Failed to upload submission file', {
          category: LogCategory.UPLOAD,
          user: { id: user.id, email: user.email },
          network: { ip_address: clientIp },
          domain: { submission_id: submissionId },
          details: {
            file_name: fileData.fileName,
            file_type: fileData.fileType
          }
        });
        console.error(`❌ Erro ao guardar ficheiro ${fileData.fileName}`);
      }
    }
    
    // Guardar metadados das descrições como JSON
    if (Object.keys(fileMetadata).length > 0) {
      const metadataPath = `songs/${submissionId}/.metadata.json`;
      const metadataJson = JSON.stringify(fileMetadata, null, 2);
      
      const metadataSuccess = await uploadToSupabase(
        metadataPath,
        metadataJson,
        'application/json'
      );
      
      if (metadataSuccess) {
        console.log('✅ Metadados de ficheiros guardados');
        logger.success('File metadata saved', {
          category: LogCategory.UPLOAD,
          domain: { submission_id: submissionId },
          details: { metadata_file_count: Object.keys(fileMetadata).length }
        });
      } else {
        console.warn('⚠️ Erro ao guardar metadados');
        logger.warn('Failed to save file metadata', {
          category: LogCategory.UPLOAD,
          domain: { submission_id: submissionId }
        });
      }
    }
    
    logger.info('Submission files processing completed', {
      category: LogCategory.UPLOAD,
      user: { id: user.id, email: user.email },
      network: { ip_address: clientIp },
      domain: { submission_id: submissionId },
      details: {
        total_files: filesData.length,
        uploaded: uploadedCount,
        failed: failedCount,
        files_with_descriptions: Object.keys(fileMetadata).length
      }
    });
  }

  const duration = Date.now() - startTime;
  
  logger.success('Music submission created successfully', {
    category: LogCategory.SUBMISSION,
    user: { id: user.id, email: user.email, role: session.user.role },
    network: { ip_address: clientIp },
    http: { method: 'POST', status_code: 200 },
    performance: { response_time_ms: duration },
    domain: { submission_id: submissionId },
    details: {
      title: title,
      type: type,
      instrument: instrument,
      moments: moments,
      has_files: filesData.length > 0,
      file_count: filesData.length
    },
    tags: ['music-submission', 'pending-review']
  });

  console.log(`✅ [SONG SUBMIT] Song submitted successfully: ${title} (ID: ${submission.id})`);
  console.log("Submissão criada com sucesso:", submission);

  return NextResponse.json({ success: true, submissionId });
});