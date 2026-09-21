package com.ideate.embed;

import com.ideate.IdeateProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmbedService {
    private static final Logger log = LoggerFactory.getLogger(EmbedService.class);
    private final IdeateProperties properties;

    public EmbedService(IdeateProperties properties) {
        this.properties = properties;
    }

    /**
     * First cut keeps a single configured embedder slot. Vectors are optional;
     * retrieval falls back to SQL ILIKE when embeddings are absent.
     */
    public void embedLater(String objectId, String text) {
        log.debug("Embedding deferred for {} ({} chars); provider={}", objectId,
                text == null ? 0 : text.length(), properties.getOllama().getBaseUrl());
    }
}
