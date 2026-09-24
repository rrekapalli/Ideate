package com.ideate.reports;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportExportTest {

    @Test
    void markdownKeepsBodyAndTitle() {
        ReportExport export = new ReportExport();
        byte[] bytes = export.render("Ice", "It floats.", "Water expands as it freezes.", "md", List.of());
        String text = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(text.contains("# Ice"));
        assertTrue(text.contains("Water expands"));
        assertTrue(export.filename("Ice floats", 2, "pdf").endsWith("-v2.pdf"));
        byte[] pdf = export.render("Ice", "It floats.", "Water expands.", "pdf", List.of());
        assertTrue(pdf.length > 100);
        byte[] docx = export.render("Ice", "It floats.", "Water expands.", "docx", List.of());
        assertTrue(docx.length > 100);
    }
}
