package com.ideate.graph;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Evaluates a simple arithmetic method over named calculation inputs. Prose methods return null. */
public final class CalculationExpr {
    private CalculationExpr() {}

    public static Double evaluate(String method, Map<String, Double> inputs) {
        if (method == null || method.isBlank() || inputs == null || inputs.isEmpty()) {
            return null;
        }
        String expr = method.trim();
        List<String> names = new ArrayList<>(inputs.keySet());
        names.sort(Comparator.comparingInt(String::length).reversed());
        for (String name : names) {
            if (!name.matches("[A-Za-z_][A-Za-z0-9_]*")) {
                continue;
            }
            Double value = inputs.get(name);
            if (value == null || value.isNaN() || value.isInfinite()) {
                return null;
            }
            expr = expr.replaceAll("\\b" + Pattern.quote(name) + "\\b", "(" + value + ")");
        }
        if (expr.matches(".*[A-Za-z_].*")) {
            return null;
        }
        try {
            return new Parser(expr).parse();
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    public static Double asNumber(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number n) {
            return n.doubleValue();
        }
        String text = String.valueOf(raw).trim().replace(",", "");
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static final class Parser {
        private final String src;
        private int i;

        Parser(String src) {
            this.src = src.replaceAll("\\s+", "");
        }

        Double parse() {
            double value = expr();
            if (i != src.length()) {
                throw new IllegalArgumentException("trailing " + src.substring(i));
            }
            return value;
        }

        private double expr() {
            double value = term();
            while (i < src.length()) {
                char c = src.charAt(i);
                if (c == '+') {
                    i++;
                    value += term();
                } else if (c == '-') {
                    i++;
                    value -= term();
                } else {
                    break;
                }
            }
            return value;
        }

        private double term() {
            double value = factor();
            while (i < src.length()) {
                char c = src.charAt(i);
                if (c == '*') {
                    i++;
                    value *= factor();
                } else if (c == '/') {
                    i++;
                    double den = factor();
                    if (den == 0) {
                        throw new IllegalArgumentException("divide by zero");
                    }
                    value /= den;
                } else {
                    break;
                }
            }
            return value;
        }

        private double factor() {
            if (i >= src.length()) {
                throw new IllegalArgumentException("empty");
            }
            char c = src.charAt(i);
            if (c == '+') {
                i++;
                return factor();
            }
            if (c == '-') {
                i++;
                return -factor();
            }
            if (c == '(') {
                i++;
                double value = expr();
                if (i >= src.length() || src.charAt(i) != ')') {
                    throw new IllegalArgumentException("missing )");
                }
                i++;
                return value;
            }
            int start = i;
            if (c == '.') {
                i++;
            }
            while (i < src.length() && (Character.isDigit(src.charAt(i)) || src.charAt(i) == '.')) {
                i++;
            }
            if (start == i) {
                throw new IllegalArgumentException("expected number at " + i);
            }
            return Double.parseDouble(src.substring(start, i).toLowerCase(Locale.ROOT));
        }
    }
}
