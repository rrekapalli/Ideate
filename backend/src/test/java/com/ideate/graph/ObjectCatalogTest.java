package com.ideate.graph;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ObjectCatalogTest {

    @Test
    void prefixesAndTheoryRule() {
        assertEquals("H", ObjectCatalog.prefix("hypothesis"));
        assertEquals("DA", ObjectCatalog.prefix("design_artifact"));
        assertFalse(ObjectCatalog.isLegalPromotion("hypothesis", "theory"));
        assertTrue(ObjectCatalog.isLegalPromotion("evaluation", "theory"));
        assertFalse(ObjectCatalog.isLegalPromotion("target", "observation"));
        assertThrows(IllegalArgumentException.class, () -> ObjectCatalog.requirePersona(""));
        ObjectCatalog.requirePersona("inventor");
        assertTrue(ObjectCatalog.isLegalPromotion("target", "target"));
    }
}
