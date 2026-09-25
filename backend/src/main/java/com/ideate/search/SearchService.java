package com.ideate.search;

import com.ideate.documents.DocumentService;
import com.ideate.graph.IdeaObject;
import com.ideate.retrieval.RetrievalService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchService {
    private final RetrievalService retrievalService;
    private final DocumentService documentService;

    public SearchService(RetrievalService retrievalService, DocumentService documentService) {
        this.retrievalService = retrievalService;
        this.documentService = documentService;
    }

    public SearchResult search(String workspaceId, String query) {
        return search(workspaceId, query, null, null);
    }

    public SearchResult search(String workspaceId, String query, String type, String category) {
        boolean hasText = query != null && !query.isBlank();
        boolean hasFilter = (type != null && !type.isBlank()) || (category != null && !category.isBlank());
        if (!hasText && !hasFilter) {
            return new SearchResult(List.of(), List.of());
        }
        List<IdeaObject> objects = retrievalService.searchObjects(workspaceId, query == null ? "" : query.trim(), 20, type, category);
        String q = query == null ? "" : query.toLowerCase();
        List<DocumentService.Item> docs = !hasText ? List.of() : documentService.items(workspaceId).stream()
                .filter(i -> i.name().toLowerCase().contains(q) || i.url().toLowerCase().contains(q))
                .limit(20)
                .toList();
        return new SearchResult(objects, docs);
    }

    public record SearchResult(List<IdeaObject> objects, List<DocumentService.Item> documents) {}
}
