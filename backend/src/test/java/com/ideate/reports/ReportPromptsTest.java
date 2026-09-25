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
        assertTrue(inventor.contains("## Live bets"));
        assertTrue(inventor.contains("## Evidence"));
        assertTrue(inventor.contains("## Open assumptions"));
        assertTrue(inventor.contains("## Decisions"));
        assertTrue(inventor.contains("## Killed ideas"));
        assertFalse(other.contains("## Killed ideas"));
        String analyst = ReportPrompts.system("analyst");
        assertTrue(analyst.contains("## Live bets"));
        assertTrue(analyst.contains("do-not-quote"));
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
