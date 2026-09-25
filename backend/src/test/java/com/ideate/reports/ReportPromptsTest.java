package com.ideate.reports;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportPromptsTest {

    @Test
    void studentRevisionSheetHeadingsOnlyForStudent() {
        String student = ReportPrompts.system("student");
        assertTrue(student.contains("What I understand"));
        assertTrue(student.contains("What I still confuse"));
        assertTrue(student.contains("Misconceptions I dropped"));
        assertTrue(student.contains("Questions still open"));
        String other = ReportPrompts.system("researcher");
        assertFalse(other.contains("What I understand"));
        assertFalse(other.contains("Misconceptions I dropped"));
        assertTrue(other.contains("established facts"));
    }
}
