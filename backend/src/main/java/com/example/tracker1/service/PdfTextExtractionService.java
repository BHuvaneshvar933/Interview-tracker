package com.example.tracker1.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class PdfTextExtractionService {

    public String extractText(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return clean(text);
        }
    }

    private String clean(String text) {
        if (text == null) return "";
        // Normalize whitespace; keep it readable for LLM prompts.
        String cleaned = text
                .replace("\u0000", " ")
                .replaceAll("[\r\t]+", " ")
                .replaceAll(" +", " ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();

        // Cap to a sane length to prevent huge prompts.
        int max = 40_000;
        if (cleaned.length() > max) {
            cleaned = cleaned.substring(0, max);
        }
        return cleaned;
    }
}
