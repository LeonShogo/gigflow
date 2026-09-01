package de.gigflow.backend.event;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Layout of the collapsible/orderable panels on a concert's detail page.
 *
 * <p>Defaults (used when an event has no stored layout) are all panels in the
 * canonical order and every panel expanded.</p>
 *
 * <p>Persisted as a compact, dependency-free string on the {@link Event} entity,
 * e.g. {@code members,setlist,rehearsals,equipment,schedule|collapsed=schedule}.</p>
 */
public class PanelLayout {

    public static final List<String> DEFAULT_ORDER = List.of(
            "members", "setlist", "rehearsals", "equipment", "locations", "schedule"
    );

    private static final String SECTION_SEPARATOR = "|";
    private static final String COLLAPSED_PREFIX = "collapsed=";

    private List<String> order;
    private Map<String, Boolean> collapsed;

    public PanelLayout() {
    }

    public PanelLayout(List<String> order, Map<String, Boolean> collapsed) {
        this.order = order;
        this.collapsed = collapsed != null ? collapsed : Map.of();
    }

    public PanelLayout(List<String> order, Set<String> collapsedKeys) {
        this(order, toMap(collapsedKeys));
    }

    public static PanelLayout defaults() {
        return new PanelLayout(DEFAULT_ORDER, Map.of());
    }

    public List<String> getOrder() {
        return order;
    }

    public void setOrder(List<String> order) {
        this.order = order;
    }

    public Map<String, Boolean> getCollapsed() {
        return collapsed;
    }

    public void setCollapsed(Map<String, Boolean> collapsed) {
        this.collapsed = collapsed != null ? collapsed : Map.of();
    }

    public String toStored() {
        StringBuilder sb = new StringBuilder(String.join(",", order));
        if (collapsed != null && !collapsed.isEmpty()) {
            sb.append(SECTION_SEPARATOR).append(COLLAPSED_PREFIX)
                    .append(String.join(",", collapsed.keySet()));
        }
        return sb.toString();
    }

    public static PanelLayout fromStored(String stored) {
        if (stored == null || stored.isBlank()) {
            return defaults();
        }
        Set<String> collapsedKeys = new LinkedHashSet<>();
        String orderPart = stored;
        if (stored.contains(SECTION_SEPARATOR)) {
            String[] parts = stored.split("\\" + SECTION_SEPARATOR, 2);
            orderPart = parts[0];
            String rest = parts[1];
            if (rest.startsWith(COLLAPSED_PREFIX)) {
                String keys = rest.substring(COLLAPSED_PREFIX.length());
                if (!keys.isBlank()) {
                    collapsedKeys.addAll(splitKeys(keys));
                }
            }
        }
        List<String> order = new ArrayList<>(splitKeys(orderPart));
        return new PanelLayout(order, collapsedKeys);
    }

    private static Set<String> splitKeys(String keys) {
        return new LinkedHashSet<>(Arrays.stream(keys.split(",", -1))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());
    }

    private static Map<String, Boolean> toMap(Set<String> keys) {
        Map<String, Boolean> map = new LinkedHashMap<>();
        for (String key : keys) {
            map.put(key, Boolean.TRUE);
        }
        return map;
    }
}
