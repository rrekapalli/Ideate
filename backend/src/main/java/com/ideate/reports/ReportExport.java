package com.ideate.reports;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ReportExport {
    private static final Pattern FENCE = Pattern.compile("(?is)```([a-zA-Z0-9_-]*)[ \\t]*\\r?\\n([\\s\\S]*?)```");
    private static final float MARGIN = 56f;
    private static final float FONT_SIZE = 11f;
    private static final float HEADING_SIZE = 16f;
    private static final float LEADING = 14.5f;

    public byte[] render(String title, String summary, String body, String format, List<String> diagrams) {
        String kind = format == null ? "md" : format.trim().toLowerCase();
        List<String> pics = diagrams == null ? List.of() : diagrams;
        return switch (kind) {
            case "md", "markdown" -> markdown(title, summary, body);
            case "pdf" -> pdf(title, summary, body, pics);
            case "docx", "doc" -> docx(title, summary, body, pics);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "format must be md, pdf, or docx");
        };
    }

    public String contentType(String format) {
        String kind = format == null ? "md" : format.trim().toLowerCase();
        return switch (kind) {
            case "pdf" -> "application/pdf";
            case "docx", "doc" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default -> "text/markdown; charset=UTF-8";
        };
    }

    public String filename(String title, int version, String format) {
        String base = (title == null || title.isBlank() ? "report" : title)
                .replaceAll("[^a-zA-Z0-9._-]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (base.isBlank()) {
            base = "report";
        }
        String ext = switch (format == null ? "md" : format.trim().toLowerCase()) {
            case "pdf" -> "pdf";
            case "docx", "doc" -> "docx";
            default -> "md";
        };
        return base + "-v" + version + "." + ext;
    }

    private byte[] markdown(String title, String summary, String body) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) {
            sb.append("# ").append(title.trim()).append("\n\n");
        }
        if (summary != null && !summary.isBlank()) {
            sb.append(summary.trim()).append("\n\n");
        }
        if (body != null) {
            sb.append(body.trim());
        }
        if (sb.length() > 0 && sb.charAt(sb.length() - 1) != '\n') {
            sb.append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] pdf(String title, String summary, String body, List<String> diagrams) {
        List<Block> blocks = blocks(title, summary, body);
        try (PDDocument doc = new PDDocument()) {
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);
            float width = page.getMediaBox().getWidth() - 2 * MARGIN;
            float y = page.getMediaBox().getHeight() - MARGIN;
            int diagramAt = 0;
            try {
                for (Block block : blocks) {
                    if (block.kind == BlockKind.MERMAID) {
                        byte[] png = decodePng(diagramAt < diagrams.size() ? diagrams.get(diagramAt) : null);
                        diagramAt++;
                        if (png != null) {
                            PageCursor cursor = ensureSpace(doc, cs, page, y, 160);
                            cs = cursor.stream;
                            page = cursor.page;
                            y = cursor.y;
                            PDImageXObject image = PDImageXObject.createFromByteArray(doc, png, "diagram");
                            float iw = image.getWidth();
                            float ih = image.getHeight();
                            float scale = Math.min(width / Math.max(iw, 1f), 320f / Math.max(ih, 1f));
                            float dw = iw * scale;
                            float dh = ih * scale;
                            cursor = ensureSpace(doc, cs, page, y, dh + 8);
                            cs = cursor.stream;
                            page = cursor.page;
                            y = cursor.y;
                            cs.drawImage(image, MARGIN, y - dh, dw, dh);
                            y -= dh + 10;
                        } else {
                            PageCursor cursor = writeWrapped(doc, cs, page, y, width, regular, FONT_SIZE,
                                    winAnsi(block.text), LEADING);
                            cs = cursor.stream;
                            page = cursor.page;
                            y = cursor.y;
                        }
                        continue;
                    }
                    PDType1Font font = block.kind == BlockKind.HEADING ? bold : regular;
                    float size = block.kind == BlockKind.HEADING ? HEADING_SIZE : FONT_SIZE;
                    float leading = block.kind == BlockKind.HEADING ? 20f : LEADING;
                    PageCursor cursor = writeWrapped(doc, cs, page, y, width, font, size, winAnsi(block.text), leading);
                    cs = cursor.stream;
                    page = cursor.page;
                    y = cursor.y - (block.kind == BlockKind.HEADING ? 4 : 2);
                }
            } finally {
                cs.close();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF export failed: " + ex.getMessage());
        }
    }

    private byte[] docx(String title, String summary, String body, List<String> diagrams) {
        List<Block> blocks = blocks(title, summary, body);
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            int diagramAt = 0;
            for (Block block : blocks) {
                if (block.kind == BlockKind.MERMAID) {
                    byte[] png = decodePng(diagramAt < diagrams.size() ? diagrams.get(diagramAt) : null);
                    diagramAt++;
                    XWPFParagraph p = doc.createParagraph();
                    XWPFRun run = p.createRun();
                    if (png != null) {
                        try {
                            BufferedImage img = ImageIO.read(new ByteArrayInputStream(png));
                            int w = img == null ? 480 : img.getWidth();
                            int h = img == null ? 280 : img.getHeight();
                            double scale = Math.min(480.0 / Math.max(w, 1), 320.0 / Math.max(h, 1));
                            run.addPicture(new ByteArrayInputStream(png), XWPFDocument.PICTURE_TYPE_PNG, "diagram.png",
                                    Units.toEMU(w * scale), Units.toEMU(h * scale));
                        } catch (Exception ex) {
                            run.setFontFamily("Courier New");
                            run.setFontSize(9);
                            run.setText(block.text);
                        }
                    } else {
                        run.setFontFamily("Courier New");
                        run.setFontSize(9);
                        run.setText(block.text);
                    }
                    continue;
                }
                XWPFParagraph p = doc.createParagraph();
                XWPFRun run = p.createRun();
                run.setFontFamily("Calibri");
                if (block.kind == BlockKind.HEADING) {
                    run.setBold(true);
                    run.setFontSize(16);
                } else {
                    run.setFontSize(11);
                }
                run.setText(block.text);
            }
            doc.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "DOCX export failed: " + ex.getMessage());
        }
    }

    private List<Block> blocks(String title, String summary, String body) {
        List<Block> out = new ArrayList<>();
        if (title != null && !title.isBlank()) {
            out.add(new Block(BlockKind.HEADING, title.trim()));
        }
        if (summary != null && !summary.isBlank()) {
            out.add(new Block(BlockKind.PARAGRAPH, summary.trim()));
        }
        String raw = body == null ? "" : body.replace("\r\n", "\n").trim();
        Matcher m = FENCE.matcher(raw);
        int last = 0;
        while (m.find()) {
            addMarkdown(out, raw.substring(last, m.start()));
            String lang = m.group(1) == null ? "" : m.group(1);
            String code = m.group(2) == null ? "" : m.group(2).trim();
            if ("mermaid".equalsIgnoreCase(lang)) {
                out.add(new Block(BlockKind.MERMAID, code));
            } else {
                out.add(new Block(BlockKind.PARAGRAPH, code));
            }
            last = m.end();
        }
        addMarkdown(out, raw.substring(last));
        return out;
    }

    private static void addMarkdown(List<Block> out, String chunk) {
        if (chunk == null || chunk.isBlank()) {
            return;
        }
        for (String para : chunk.trim().split("\\n\\s*\\n")) {
            String t = para.trim();
            if (t.isEmpty()) {
                continue;
            }
            if (t.startsWith("#")) {
                out.add(new Block(BlockKind.HEADING, t.replaceFirst("^#+\\s*", "").trim()));
                continue;
            }
            String joined = t.replaceAll("\\n+", " ").replaceAll("\\s+", " ").trim();
            out.add(new Block(BlockKind.PARAGRAPH, joined));
        }
    }

    private PageCursor writeWrapped(PDDocument doc, PDPageContentStream cs, PDPage page, float y, float width,
                                    PDType1Font font, float size, String text, float leading) throws Exception {
        List<String> lines = wrap(font, size, text, width);
        PageCursor cursor = new PageCursor(cs, page, y);
        for (String line : lines) {
            cursor = ensureSpace(doc, cursor.stream, cursor.page, cursor.y, leading);
            cursor.stream.beginText();
            cursor.stream.setFont(font, size);
            cursor.stream.newLineAtOffset(MARGIN, cursor.y);
            cursor.stream.showText(line.isEmpty() ? " " : line);
            cursor.stream.endText();
            cursor = new PageCursor(cursor.stream, cursor.page, cursor.y - leading);
        }
        return new PageCursor(cursor.stream, cursor.page, cursor.y - 4);
    }

    private PageCursor ensureSpace(PDDocument doc, PDPageContentStream cs, PDPage page, float y, float need)
            throws Exception {
        if (y - need >= MARGIN) {
            return new PageCursor(cs, page, y);
        }
        cs.close();
        PDPage next = new PDPage(PDRectangle.A4);
        doc.addPage(next);
        PDPageContentStream stream = new PDPageContentStream(doc, next);
        return new PageCursor(stream, next, next.getMediaBox().getHeight() - MARGIN);
    }

    private static List<String> wrap(PDType1Font font, float size, String text, float width) throws Exception {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return lines;
        }
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String trial = line.isEmpty() ? word : line + " " + word;
            float w = font.getStringWidth(trial) / 1000 * size;
            if (w > width && !line.isEmpty()) {
                lines.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(trial);
            }
        }
        if (!line.isEmpty()) {
            lines.add(line.toString());
        }
        return lines;
    }

    private static byte[] decodePng(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim();
        if (s.startsWith("<svg") || s.startsWith("<?xml")) {
            return null;
        }
        int comma = s.indexOf("base64,");
        if (comma >= 0) {
            s = s.substring(comma + 7);
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(s.replaceAll("\\s+", ""));
            if (bytes.length > 8 && bytes[0] == (byte) 0x89 && bytes[1] == 0x50) {
                return bytes;
            }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String winAnsi(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '\t') {
                sb.append("  ");
            } else if (c >= 32 && c <= 126 || c == ' ') {
                sb.append(c);
            } else if (c == 0x2013 || c == 0x2014) {
                sb.append('-');
            } else if (c == 0x2018 || c == 0x2019) {
                sb.append('\'');
            } else if (c == 0x201C || c == 0x201D) {
                sb.append('"');
            } else if (c > 126 && c < 256) {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private enum BlockKind { HEADING, PARAGRAPH, MERMAID }

    private record Block(BlockKind kind, String text) {}

    private record PageCursor(PDPageContentStream stream, PDPage page, float y) {}
}
