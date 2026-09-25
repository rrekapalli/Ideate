package com.ideate.retrieval;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ObjectSearchQueryTest {

    @Test
    void bindsOptionalTypeAndCategory() {
        ObjectSearchQuery q = ObjectSearchQuery.build("ws", "orbit", "misconception", "abandoned", 20);
        assertTrue(q.sql.contains("AND type = ?"));
        assertTrue(q.sql.contains("AND object_category = ?"));
        assertEquals("ws", q.args.get(0));
        assertEquals("%orbit%", q.args.get(1));
        assertEquals("misconception", q.args.get(5));
        assertEquals("abandoned", q.args.get(6));
        assertEquals(20, q.args.get(7));
    }

    @Test
    void typeFilterWithoutTextStillSelects() {
        ObjectSearchQuery q = ObjectSearchQuery.build("ws", "  ", "misconception", null, 10);
        assertFalse(q.sql.contains("LIKE"));
        assertTrue(q.sql.contains("AND type = ?"));
        assertEquals(List.of("ws", "misconception", 10).toString(), q.args.toString());
    }
}
