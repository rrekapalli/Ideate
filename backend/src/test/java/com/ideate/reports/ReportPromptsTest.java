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
        String inventor = ReportPrompts.system("inventor");
        assertTrue(inventor.contains("## Problem"));
        assertTrue(inventor.contains("## Constraints"));
        assertTrue(inventor.contains("## Current architecture"));
        assertTrue(inventor.contains("## Open targets"));
        assertTrue(inventor.contains("## Decisions"));
        assertTrue(inventor.contains("## Killed options"));
        assertFalse(other.contains("## Killed options"));
        String explorer = ReportPrompts.system("explorer");
        assertTrue(explorer.contains("## The thought"));
        assertTrue(explorer.contains("## Concepts"));
        assertTrue(explorer.contains("## Unknowns"));
        assertTrue(explorer.contains("## Assumptions"));
        assertTrue(explorer.contains("## What was dropped"));
        assertFalse(explorer.contains("established facts"));
        assertFalse(other.contains("## The thought"));
    }
}
