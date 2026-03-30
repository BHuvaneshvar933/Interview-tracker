package com.example.tracker1.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Small CLI utility to generate a bcrypt hash locally.
 * Usage: java com.example.tracker1.util.BcryptCli <password>
 */
public class BcryptCli {
    public static void main(String[] args) {
        if (args == null || args.length != 1 || args[0] == null || args[0].isBlank()) {
            System.err.println("Usage: BcryptCli <password>");
            System.exit(2);
        }

        BCryptPasswordEncoder enc = new BCryptPasswordEncoder(10);
        System.out.println(enc.encode(args[0]));
    }
}
