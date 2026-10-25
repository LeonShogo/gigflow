package de.gigflow.backend.event;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class EventMembersRequest {

    @NotEmpty
    private List<Long> userIds;

    public List<Long> getUserIds() {
        return userIds;
    }

    public void setUserIds(List<Long> userIds) {
        this.userIds = userIds;
    }
}
