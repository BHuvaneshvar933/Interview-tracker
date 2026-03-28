package com.example.tracker1.service;

import com.example.tracker1.model.entity.ResumeDocument;
import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.repository.ResumeRepository;
import com.example.tracker1.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final PdfTextExtractionService pdfTextExtractionService;

    public ResumeDocument saveResume(MultipartFile resumeFile) throws IOException {
        String userEmail = SecurityUtil.getCurrentUserEmail();
        String extracted = pdfTextExtractionService.extractText(resumeFile);

        ResumeDocument doc = ResumeDocument.builder()
                .userEmail(userEmail)
                .fileName(resumeFile.getOriginalFilename())
                .contentType(resumeFile.getContentType())
                .fileSize(resumeFile.getSize())
                .extractedText(extracted)
                .createdAt(Instant.now())
                .build();

        return resumeRepository.save(doc);
    }

    public ResumeDocument getResumeOrThrow(String resumeId) {
        String userEmail = SecurityUtil.getCurrentUserEmail();
        return resumeRepository.findByIdAndUserEmail(resumeId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
    }

    public List<ResumeDocument> listResumes() {
        String userEmail = SecurityUtil.getCurrentUserEmail();
        return resumeRepository.findAllByUserEmailOrderByCreatedAtDesc(userEmail);
    }
}
