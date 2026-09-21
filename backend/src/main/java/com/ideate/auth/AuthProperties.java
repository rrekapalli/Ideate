package com.ideate.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ideate.auth")
public class AuthProperties {
    private boolean enabled = false;
    private String devAccountId = "acct_local_dev";
    private String devEmail = "dev@localhost";
    private String devName = "Local Thinker";
    private int devCreditBalance = 10000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDevAccountId() {
        return devAccountId;
    }

    public void setDevAccountId(String devAccountId) {
        this.devAccountId = devAccountId;
    }

    public String getDevEmail() {
        return devEmail;
    }

    public void setDevEmail(String devEmail) {
        this.devEmail = devEmail;
    }

    public String getDevName() {
        return devName;
    }

    public void setDevName(String devName) {
        this.devName = devName;
    }

    public int getDevCreditBalance() {
        return devCreditBalance;
    }

    public void setDevCreditBalance(int devCreditBalance) {
        this.devCreditBalance = devCreditBalance;
    }
}
