package com.example.tracker1.service;

import com.example.tracker1.model.dto.GenerateQuestionsRequest;
import com.example.tracker1.model.dto.GenerateQuestionsResponse;
import com.example.tracker1.model.dto.ResumeJobMatchResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Deprecated
public class OpenAiService {

    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String chatModel() {
        return System.getenv().getOrDefault("OPENAI_MODEL", "gpt-4o-mini");
    }

    private String embeddingsModel() {
        return System.getenv().getOrDefault("OPENAI_EMBEDDINGS_MODEL", "text-embedding-3-small");
    }

    private void ensureApiKeyConfigured() {
        String key = System.getenv("OPENAI_API_KEY");
        if (key == null || key.isBlank()) {
            throw new RuntimeException("OPENAI_API_KEY is not configured");
        }
    }

    public ResumeJobMatchResponse analyzeResume(String resumeText, String jobDescription) {
        ensureApiKeyConfigured();

        String system = "You are an expert ATS + recruiter + career coach. Output STRICT JSON only.";
        String user = "Analyze the RESUME and JOB DESCRIPTION.\n\n" +
                "Return JSON with this exact schema:\n" +
                "{\n" +
                "  \"matchScore\": number,\n" +
                "  \"matchingSkills\": string[],\n" +
                "  \"missingSkills\": string[],\n" +
                "  \"gapAnalysis\": string,\n" +
                "  \"suggestions\": string[],\n" +
                "  \"keywordsToAdd\": string[]\n" +
                "}\n\n" +
                "Rules:\n" +
                "- matchScore is 0-100 (integer).\n" +
                "- matchingSkills/missingSkills/keywordsToAdd are deduplicated, concise, uppercase where appropriate (e.g., JAVA, AWS).\n" +
                "- suggestions are actionable bullet-style strings.\n" +
                "- No markdown, no code fences.\n\n" +
                "RESUME:\n" + resumeText + "\n\n" +
                "JOB DESCRIPTION:\n" + jobDescription;

        JsonNode json = callChatJson(system, user);
        ResumeJobMatchResponse parsed = objectMapper.convertValue(json, ResumeJobMatchResponse.class);

        // Clamp matchScore.
        int score = parsed.getMatchScore();
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        parsed.setMatchScore(score);
        return parsed;
    }

    public GenerateQuestionsResponse generateQuestions(String resumeText, GenerateQuestionsRequest req) {
        ensureApiKeyConfigured();

        String difficulty = (req.getDifficulty() == null || req.getDifficulty().isBlank())
                ? "mixed"
                : req.getDifficulty().trim().toLowerCase();

        String system = "You are a senior interviewer and interview coach. Output STRICT JSON only.";
        String user = "Generate an interview practice pack for:\n" +
                "Company: " + req.getCompany() + "\n" +
                "Role: " + req.getRole() + "\n" +
                "Difficulty: " + difficulty + "\n\n" +
                "Use the candidate RESUME to personalize topics and gaps.\n\n" +
                "Return JSON with this exact schema:\n" +
                "{\n" +
                "  \"difficulty\": string,\n" +
                "  \"topics\": string[],\n" +
                "  \"questions\": [\n" +
                "    {\n" +
                "      \"type\": \"TECHNICAL\"|\"BEHAVIORAL\"|\"COMPANY\",\n" +
                "      \"topic\": string,\n" +
                "      \"difficulty\": \"EASY\"|\"MEDIUM\"|\"HARD\",\n" +
                "      \"question\": string,\n" +
                "      \"guidance\": string\n" +
                "    }\n" +
                "  ]\n" +
                "}\n\n" +
                "Rules:\n" +
                "- Provide 18-25 questions total.\n" +
                "- Ensure a mix of technical + behavioral + company-specific questions.\n" +
                "- guidance is brief and practical (how to answer).\n" +
                "- No markdown, no code fences.\n\n" +
                "RESUME:\n" + resumeText;

        JsonNode json = callChatJson(system, user);
        return objectMapper.convertValue(json, GenerateQuestionsResponse.class);
    }

    public List<Double> embed(String input) {
        ensureApiKeyConfigured();

        Map<String, Object> body = new HashMap<>();
        body.put("model", embeddingsModel());
        body.put("input", input);

        JsonNode node = openAiWebClient.post()
                .uri("/embeddings")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(30))
                .onErrorResume(e -> Mono.error(new RuntimeException("OpenAI embeddings call failed: " + e.getMessage())))
                .block();

        if (node == null) {
            throw new RuntimeException("OpenAI embeddings response was empty");
        }

        JsonNode emb = node.at("/data/0/embedding");
        if (!emb.isArray()) {
            throw new RuntimeException("OpenAI embeddings response missing embedding vector");
        }

        return objectMapper.convertValue(emb, objectMapper.getTypeFactory().constructCollectionType(List.class, Double.class));
    }

    private JsonNode callChatJson(String system, String user) {
        Map<String, Object> req = new HashMap<>();
        req.put("model", chatModel());
        req.put("temperature", 0.2);
        req.put("messages", List.of(
                Map.of("role", "system", "content", system),
                Map.of("role", "user", "content", user)
        ));
        req.put("response_format", Map.of("type", "json_object"));

        JsonNode node = openAiWebClient.post()
                .uri("/chat/completions")
                .bodyValue(req)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(45))
                .onErrorResume(e -> Mono.error(new RuntimeException("OpenAI chat call failed: " + e.getMessage())))
                .block();

        if (node == null) {
            throw new RuntimeException("OpenAI response was empty");
        }

        String content = node.at("/choices/0/message/content").asText(null);
        if (content == null || content.isBlank()) {
            throw new RuntimeException("OpenAI response content was empty");
        }

        String cleaned = stripCodeFences(content.trim());
        try {
            return objectMapper.readTree(cleaned);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse OpenAI JSON response");
        }
    }

    private String stripCodeFences(String s) {
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            if (firstNewline > 0) {
                s = s.substring(firstNewline + 1);
            }
            int lastFence = s.lastIndexOf("```");
            if (lastFence >= 0) {
                s = s.substring(0, lastFence);
            }
        }
        return s.trim();
    }
}
