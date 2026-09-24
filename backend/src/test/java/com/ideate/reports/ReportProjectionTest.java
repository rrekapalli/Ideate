package com.ideate.reports;

import com.ideate.graph.GraphService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportProjectionTest {

    @Test
    void emptyGraphSaysNotConclusive() {
        String text = ReportProjection.assemble(new GraphService.GraphSnapshot(List.of(), List.of()), "Ice", "student");
        assertTrue(text.contains("not reached a conclusion"));
        assertTrue(text.contains("Ice"));
    }
}
