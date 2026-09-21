package com.ideate;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ideate")
public class IdeateProperties {

    private String migrationsPath = "../database-migrations";
    private final Ollama ollama = new Ollama();
    private final Openai openai = new Openai();
    private final Cors cors = new Cors();

    public String getMigrationsPath() {
        return migrationsPath;
    }

    public void setMigrationsPath(String migrationsPath) {
        this.migrationsPath = migrationsPath;
    }

    public Ollama getOllama() {
        return ollama;
    }

    public Openai getOpenai() {
        return openai;
    }

    public Cors getCors() {
        return cors;
    }

    public static class Ollama {
        private String baseUrl = "http://localhost:11434";
        private String model = "llama3.2";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }
    }

    public static class Openai {
        private String baseUrl = "https://api.openai.com";
        private String apiKey = "";
        private String model = "gpt-4o-mini";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }
    }

    public static class Cors {
        private String origins = "http://localhost:4200,http://127.0.0.1:4200,https://ideate.tailce422e.ts.net";

        public String getOrigins() {
            return origins;
        }

        public void setOrigins(String origins) {
            this.origins = origins;
        }
    }
}
