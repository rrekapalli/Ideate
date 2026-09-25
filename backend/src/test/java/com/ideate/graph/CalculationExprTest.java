package com.ideate.graph;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CalculationExprTest {

    @Test
    void evaluatesNamedArithmetic() {
        Double value = CalculationExpr.evaluate("distance / throwRatio", Map.of("distance", 1.2, "throwRatio", 0.8));
        assertEquals(1.5, value, 1e-9);
    }

    @Test
    void rejectsProseMethods() {
        assertNull(CalculationExpr.evaluate("estimate from datasheet brightness", Map.of("brightness", 200.0)));
    }
}
