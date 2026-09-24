package com.ideate.attachments;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

final class AttachmentTextExtractor {
    static final int PER_FILE_CHARS = 4_000;
    static final int PER_TURN_CHARS = 8_000;

    private static final Logger log = LoggerFactory.getLogger(AttachmentTextExtractor.class);

    private AttachmentTextExtractor() {}

    static ExtractResult extract(Path file, String originalName, String contentType) {
        String ext = extension(originalName);
        try {
            if (isImage(ext, contentType)) {
                return ExtractResult.skipped();
            }
            if ("xlsx".equals(ext) || "pptx".equals(ext)) {
                return ExtractResult.skipped();
            }
            String text = switch (ext) {
                case "pdf" -> pdf(file);
                case "docx" -> docx(file);
                case "txt", "md", "csv", "markdown", "text" -> plain(file);
                default -> {
                    if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("text/")) {
                        yield plain(file);
                    }
                    yield null;
                }
            };
            if (text == null) {
                return ExtractResult.skipped();
            }
            String trimmed = cap(text.strip(), PER_FILE_CHARS);
            return trimmed.isBlank() ? ExtractResult.skipped() : ExtractResult.ok(trimmed);
        } catch (Exception ex) {
            log.warn("Extract failed for {}: {}", originalName, ex.getMessage());
            return ExtractResult.failed();
        }
    }

    private static String pdf(Path file) throws Exception {
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(doc);
        }
    }

    private static String docx(Path file) throws Exception {
        try (InputStream in = Files.newInputStream(file);
             XWPFDocument doc = new XWPFDocument(in);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private static String plain(Path file) throws Exception {
        long limit = PER_FILE_CHARS * 4L;
        byte[] bytes = Files.readAllBytes(file);
        if (bytes.length > limit) {
            byte[] head = new byte[(int) limit];
            System.arraycopy(bytes, 0, head, 0, head.length);
            bytes = head;
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    static boolean isImage(String ext, String contentType) {
        if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            return true;
        }
        return switch (ext) {
            case "png", "jpg", "jpeg", "gif", "webp" -> true;
            default -> false;
        };
    }

    static String extension(String name) {
        if (name == null) {
            return "";
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    static String cap(String value, int max) {
        if (value == null) {
            return "";
        }
        String collapsed = value.replace("\r\n", "\n").replace('\r', '\n');
        if (collapsed.length() <= max) {
            return collapsed;
        }
        return collapsed.substring(0, max) + "…";
    }

    record ExtractResult(String status, String text) {
        static ExtractResult ok(String text) {
            return new ExtractResult("ok", text);
        }

        static ExtractResult skipped() {
            return new ExtractResult("skipped", null);
        }

        static ExtractResult failed() {
            return new ExtractResult("failed", null);
        }
    }
}
