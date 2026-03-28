package com.example.tracker1.service;

import com.example.tracker1.model.dto.GenerateQuestionsRequest;
import com.example.tracker1.model.dto.GenerateQuestionsResponse;
import com.example.tracker1.model.dto.ResumeJobMatchResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static java.lang.Math.min;

@Service
public class GeminiService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final ObjectMapper lenientObjectMapper;

    public GeminiService(WebClient geminiWebClient, ObjectMapper objectMapper) {
        this.geminiWebClient = geminiWebClient;
        this.objectMapper = objectMapper;

        // Gemini sometimes returns almost-JSON (e.g., trailing commas or unescaped control chars).
        // Keep strict parsing first, then fallback to a lenient mapper.
        ObjectMapper m = objectMapper.copy();
        m.getFactory().configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
        m.getFactory().configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true);
        m.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);
        this.lenientObjectMapper = m;
    }

    private String apiKey() {
        return System.getenv("GEMINI_API_KEY");
    }

    private String chatModel() {
        return System.getenv().getOrDefault("GEMINI_MODEL", "gemini-2.5-flash");
    }

    private String embeddingsModel() {
        return System.getenv().getOrDefault("GEMINI_EMBEDDINGS_MODEL", "text-embedding-004");
    }

    private void ensureApiKeyConfigured() {
        String key = apiKey();
        if (key == null || key.isBlank()) {
            throw new RuntimeException("GEMINI_API_KEY is not configured");
        }
    }

    public ResumeJobMatchResponse analyzeResume(String resumeText, String jobDescription) {
        ensureApiKeyConfigured();

        String resume = truncateForPrompt(resumeText, 12_000);
        String jd = truncateForPrompt(jobDescription, 12_000);

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
                "- matchingSkills: max 15 items.\n" +
                "- missingSkills: max 15 items.\n" +
                "- keywordsToAdd: max 20 items.\n" +
                "- suggestions: max 6 actionable bullet-style strings.\n" +
                "- gapAnalysis: 2-4 short sentences.\n" +
                "- Output ONLY the JSON object. No markdown, no code fences, no extra text.\n\n" +
                "RESUME:\n" + resume + "\n\n" +
                "JOB DESCRIPTION:\n" + jd;

        JsonNode json = callGenerateContentJson(system, user);
        ResumeJobMatchResponse parsed = objectMapper.convertValue(json, ResumeJobMatchResponse.class);

        int score = parsed.getMatchScore();
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        parsed.setMatchScore(score);
        return parsed;
    }

    public GenerateQuestionsResponse generateQuestions(String resumeText, GenerateQuestionsRequest req) {
        ensureApiKeyConfigured();

        String resume = truncateForPrompt(resumeText, 8_000);

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
                "- Provide 10-12 questions total (to avoid truncation).\n" +
                "- Ensure a mix of technical + behavioral + company-specific questions.\n" +
                "- guidance is ONE short sentence (how to answer).\n" +
                "- Keep question text concise.\n" +
                "- Output ONLY the JSON object. No markdown, no code fences, no extra text.\n\n" +
                "RESUME:\n" + resume;

        JsonNode json = callGenerateContentJson(system, user);
        return objectMapper.convertValue(json, GenerateQuestionsResponse.class);
    }

    public List<Double> embed(String input) {
        ensureApiKeyConfigured();

        Map<String, Object> body = new HashMap<>();
        body.put("content", Map.of(
                "parts", List.of(Map.of("text", input))
        ));

        JsonNode node = postWithRetry(
                "/models/{model}:embedContent",
                embeddingsModel(),
                body,
                Duration.ofSeconds(30)
        );

        if (node == null) {
            throw new RuntimeException("Gemini embeddings response was empty");
        }

        JsonNode emb = node.at("/embedding/values");
        if (!emb.isArray()) {
            throw new RuntimeException("Gemini embeddings response missing embedding vector");
        }

        return objectMapper.convertValue(emb, objectMapper.getTypeFactory().constructCollectionType(List.class, Double.class));
    }

    public List<String> listModels() {
        ensureApiKeyConfigured();

        JsonNode node;
        try {
            node = geminiWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models")
                            .queryParam("key", apiKey().trim())
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(20))
                    .block();
        } catch (WebClientResponseException e) {
            String body = safeTrim(e.getResponseBodyAsString());
            throw new RuntimeException("Gemini list models failed (" + e.getRawStatusCode() + "): " + body, e);
        }

        if (node == null) return List.of();
        JsonNode models = node.get("models");
        if (models == null || !models.isArray()) return List.of();

        List<String> out = new ArrayList<>();
        for (JsonNode m : models) {
            String name = m.get("name") != null ? m.get("name").asText() : null;
            if (name != null && !name.isBlank()) out.add(name);
        }
        return out;
    }

    private JsonNode callGenerateContentJson(String system, String user) {
        Map<String, Object> req = new HashMap<>();
        req.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", system))
        ));
        req.put("contents", List.of(
                Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", user))
                )
        ));
        req.put("generationConfig", Map.of(
                "temperature", 0.2,
                "maxOutputTokens", 4096,
                "responseMimeType", "application/json"
        ));

        List<String> modelsToTry = buildChatModelFallbacks();

        JsonNode node = null;
        RuntimeException last = null;

        for (String model : modelsToTry) {
            try {
                node = postWithRetry(
                        "/models/{model}:generateContent",
                        model,
                        req,
                        Duration.ofSeconds(45)
                );
                last = null;
                break;
            } catch (WebClientResponseException e) {
                if (e.getStatusCode().value() == 404) {
                    last = new RuntimeException("Gemini model not found: " + model);
                    continue;
                }
                String body = safeTrim(e.getResponseBodyAsString());
                throw new RuntimeException("Gemini chat call failed (" + e.getRawStatusCode() + "): " + body, e);
            } catch (Exception e) {
                throw new RuntimeException("Gemini chat call failed: " + e.getMessage(), e);
            }
        }

        if (node == null) {
            String tried = String.join(", ", modelsToTry);
            if (last != null) {
                throw new RuntimeException(last.getMessage() + " (tried: " + tried + ")");
            }
            throw new RuntimeException("Gemini chat call failed (no response) (tried: " + tried + ")");
        }

        if (node == null) {
            throw new RuntimeException("Gemini response was empty");
        }

        String content = node.at("/candidates/0/content/parts/0/text").asText(null);
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Gemini response content was empty");
        }

        String cleaned = stripCodeFences(content.trim());
        return parseJsonLenient(cleaned);
    }

    private JsonNode parseJsonLenient(String text) {
        String t = (text == null) ? "" : text.trim();
        if (t.isEmpty()) {
            throw new RuntimeException("Failed to parse Gemini JSON response (empty)");
        }

        // 1) Try direct parse.
        JsonNode node = tryReadTree(t);
        if (node != null) {
            // Sometimes Gemini returns a JSON string that contains the real JSON.
            if (node.isTextual()) {
                JsonNode inner = tryReadTree(node.asText());
                if (inner != null) return inner;
            } else {
                return node;
            }
        }

        // 2) Extract the first complete JSON value (object/array) from a mixed response.
        String extracted = extractFirstCompleteJsonValue(t);
        if (extracted != null) {
            JsonNode extractedNode = tryReadTree(extracted);
            if (extractedNode != null) {
                if (extractedNode.isTextual()) {
                    JsonNode inner = tryReadTree(extractedNode.asText());
                    if (inner != null) return inner;
                } else {
                    return extractedNode;
                }
            }
        }

        // If the model started JSON but never closed it, this is almost always truncation.
        if (!isLikelyCompleteJson(t)) {
            throw new RuntimeException("Gemini returned incomplete JSON (truncated). Reduce input size or increase maxOutputTokens.");
        }

        throw new RuntimeException("Failed to parse Gemini JSON response. First chars: " + safeTrim(t));
    }

    private String extractFirstCompleteJsonValue(String s) {
        if (s == null) return null;
        int obj = s.indexOf('{');
        int arr = s.indexOf('[');
        int start;
        if (obj < 0 && arr < 0) return null;
        if (obj < 0) start = arr;
        else if (arr < 0) start = obj;
        else start = Math.min(obj, arr);

        int brace = 0;
        int bracket = 0;
        boolean inString = false;
        boolean escape = false;

        for (int i = start; i < s.length(); i++) {
            char c = s.charAt(i);
            if (escape) {
                escape = false;
                continue;
            }
            if (c == '\\' && inString) {
                escape = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;

            if (c == '{') brace++;
            if (c == '}') brace--;
            if (c == '[') bracket++;
            if (c == ']') bracket--;

            if (brace == 0 && bracket == 0 && i > start) {
                return s.substring(start, i + 1).trim();
            }
        }

        return null;
    }

    private boolean isLikelyCompleteJson(String s) {
        int brace = 0;
        int bracket = 0;
        boolean inString = false;
        boolean escape = false;

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (escape) {
                escape = false;
                continue;
            }
            if (c == '\\' && inString) {
                escape = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;
            if (c == '{') brace++;
            if (c == '}') brace--;
            if (c == '[') bracket++;
            if (c == ']') bracket--;
        }

        // For valid complete JSON, these should end at zero.
        return brace == 0 && bracket == 0;
    }

    private String truncateForPrompt(String s, int maxChars) {
        if (s == null) return "";
        String t = s.trim();
        if (t.length() <= maxChars) return t;

        // Keep the start of the doc; most resumes put key info early.
        return t.substring(0, maxChars);
    }

    private JsonNode tryReadTree(String s) {
        try {
            return objectMapper.readTree(s);
        } catch (JsonProcessingException ignored) {
            try {
                return lenientObjectMapper.readTree(s);
            } catch (JsonProcessingException ignored2) {
                return null;
            }
        }
    }

    private String escapeForJsonString(String s) {
        // Minimal escaping so we can wrap raw text in quotes and parse it.
        return s
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
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

    private List<String> buildChatModelFallbacks() {
        List<String> models = new ArrayList<>();
        String primary = chatModel();
        if (primary != null && !primary.isBlank()) models.add(primary.trim());

        // Common aliases / alternates (API availability varies by key/project).
        for (String m : List.of(
                "gemini-2.5-flash",
                "gemini-2.5-flash-latest",
                "gemini-1.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-pro",
                "gemini-1.5-pro-latest",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.0-pro",
                "gemini-pro"
        )) {
            if (!models.contains(m)) models.add(m);
        }

        return models;
    }

    private String safeTrim(String s) {
        if (s == null) return "";
        String t = s.trim();
        return (t.length() > 800) ? t.substring(0, 800) : t;
    }

    private JsonNode postWithRetry(String pathTemplate, String model, Object body, Duration timeout) {
        int maxAttempts = 2;
        RuntimeException last = null;

        String normalizedModel = normalizeModelName(model);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return geminiWebClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path(pathTemplate)
                                .queryParam("key", apiKey().trim())
                                .build(normalizedModel))
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .timeout(timeout)
                        .block();
            } catch (WebClientResponseException e) {
                int code = e.getRawStatusCode();

                // Handle rate limiting gracefully.
                if (code == 429) {
                    long waitMs = retryAfterMillis(e);
                    if (attempt < maxAttempts) {
                        sleepQuietly(waitMs);
                        continue;
                    }

                    String msg = safeTrim(e.getResponseBodyAsString());
                    throw new RuntimeException("Gemini rate limit exceeded (HTTP 429). Wait ~" + (waitMs / 1000) + "s and retry. " + msg, e);
                }

                // Bubble up so caller can handle 404 model fallback.
                throw e;
            } catch (Exception e) {
                last = new RuntimeException("Gemini call failed: " + e.getMessage(), e);
                break;
            }
        }

        throw (last != null) ? last : new RuntimeException("Gemini call failed");
    }

    private String normalizeModelName(String model) {
        if (model == null) return "";
        String m = model.trim();
        if (m.startsWith("models/")) {
            m = m.substring("models/".length());
        }
        return m;
    }

    private long retryAfterMillis(WebClientResponseException e) {
        String ra = e.getHeaders().getFirst("Retry-After");
        if (ra != null) {
            try {
                long sec = Long.parseLong(ra.trim());
                return min(sec, 60) * 1000;
            } catch (NumberFormatException ignored) {
            }
        }

        // Default backoff when header is absent.
        return 5000;
    }

    private void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
