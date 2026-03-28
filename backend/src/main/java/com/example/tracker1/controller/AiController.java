package com.example.tracker1.controller;

import com.example.tracker1.model.dto.*;
import com.example.tracker1.model.entity.InterviewQuestionSet;
import com.example.tracker1.model.entity.ResumeDocument;
import com.example.tracker1.repository.InterviewQuestionSetRepository;
 import com.example.tracker1.service.GeminiService;
import com.example.tracker1.service.ResumeService;
import com.example.tracker1.util.SecurityUtil;
import com.example.tracker1.exception.BadRequestException;
import com.example.tracker1.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiController {

    private final ResumeService resumeService;
      private final GeminiService geminiService;
    private final InterviewQuestionSetRepository interviewQuestionSetRepository;

    // Debug helper: lists models available for your GEMINI_API_KEY
    @GetMapping("/ai/models")
    public List<String> listGeminiModels() {
        return geminiService.listModels();
    }

    // Helper: upload resume once and reuse resumeId
    @PostMapping(value = "/resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResumeUploadResponse uploadResume(@RequestPart("resumeFile") MultipartFile resumeFile) throws Exception {
        validatePdf(resumeFile);
        ResumeDocument saved = resumeService.saveResume(resumeFile);
        return ResumeUploadResponse.builder()
                .resumeId(saved.getId())
                .fileName(saved.getFileName())
                .contentType(saved.getContentType())
                .fileSize(saved.getFileSize())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @GetMapping("/resumes")
    public List<ResumeListItemResponse> listResumes() {
        return resumeService.listResumes().stream()
                .map(r -> ResumeListItemResponse.builder()
                        .resumeId(r.getId())
                        .fileName(r.getFileName())
                        .contentType(r.getContentType())
                        .fileSize(r.getFileSize())
                        .createdAt(r.getCreatedAt())
                        .build())
                .toList();
    }

    @PostMapping(value = "/analyze-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AnalyzeResumeResponse analyzeResume(
            @RequestPart("resumeFile") MultipartFile resumeFile,
            @RequestPart("jobDescription") String jobDescription
    ) throws Exception {

        validatePdf(resumeFile);
        if (jobDescription == null || jobDescription.isBlank()) {
            throw new BadRequestException("jobDescription is required");
        }

        ResumeDocument resume = resumeService.saveResume(resumeFile);
         ResumeJobMatchResponse analysis = geminiService.analyzeResume(resume.getExtractedText(), jobDescription);

        return AnalyzeResumeResponse.builder()
                .resumeId(resume.getId())
                .analysis(analysis)
                .build();
    }

    @PostMapping("/generate-questions")
    public GenerateQuestionsApiResponse generateQuestions(@Valid @RequestBody GenerateQuestionsRequest request) {
        String userEmail = SecurityUtil.getCurrentUserEmail();
        ResumeDocument resume = resumeService.getResumeOrThrow(request.getResumeId());

         GenerateQuestionsResponse payload = geminiService.generateQuestions(resume.getExtractedText(), request);

        InterviewQuestionSet saved = interviewQuestionSetRepository.save(InterviewQuestionSet.builder()
                .userEmail(userEmail)
                .resumeId(request.getResumeId())
                .company(request.getCompany())
                .role(request.getRole())
                .difficulty(payload.getDifficulty())
                .topics(payload.getTopics())
                .questions((payload.getQuestions() == null) ? List.of() : payload.getQuestions().stream()
                        .map(q -> InterviewQuestionSet.QuestionItem.builder()
                                .type(q.getType())
                                .topic(q.getTopic())
                                .difficulty(q.getDifficulty())
                                .question(q.getQuestion())
                                .guidance(q.getGuidance())
                                .build())
                        .toList())
                .createdAt(Instant.now())
                .build());

        return GenerateQuestionsApiResponse.builder()
                .questionSetId(saved.getId())
                .resumeId(saved.getResumeId())
                .company(saved.getCompany())
                .role(saved.getRole())
                .createdAt(saved.getCreatedAt())
                .payload(payload)
                .build();
    }

    @GetMapping("/questions/{questionSetId}")
    public QuestionSetResponse getQuestionSet(@PathVariable String questionSetId) {
        String userEmail = SecurityUtil.getCurrentUserEmail();
        InterviewQuestionSet set = interviewQuestionSetRepository.findByIdAndUserEmail(questionSetId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Question set not found"));

        List<InterviewQuestionResponse> questions = (set.getQuestions() == null) ? List.of() : set.getQuestions().stream()
                .map(q -> InterviewQuestionResponse.builder()
                        .type(q.getType())
                        .topic(q.getTopic())
                        .difficulty(q.getDifficulty())
                        .question(q.getQuestion())
                        .guidance(q.getGuidance())
                        .build())
                .toList();

        return QuestionSetResponse.builder()
                .questionSetId(set.getId())
                .resumeId(set.getResumeId())
                .company(set.getCompany())
                .role(set.getRole())
                .difficulty(set.getDifficulty())
                .topics(set.getTopics())
                .questions(questions)
                .createdAt(set.getCreatedAt())
                .build();
    }

    private void validatePdf(MultipartFile resumeFile) {
        if (resumeFile == null || resumeFile.isEmpty()) {
            throw new BadRequestException("resumeFile is required");
        }

        String ct = resumeFile.getContentType();
        String name = resumeFile.getOriginalFilename();
        boolean looksPdf = (ct != null && ct.toLowerCase().contains("pdf")) || (name != null && name.toLowerCase().endsWith(".pdf"));
        if (!looksPdf) {
            throw new BadRequestException("resumeFile must be a PDF");
        }
    }
}
