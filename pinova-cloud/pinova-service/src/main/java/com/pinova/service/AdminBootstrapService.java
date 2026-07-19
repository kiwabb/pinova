package com.pinova.service;

import com.pinova.service.command.BootstrapAdminCommand;

public interface AdminBootstrapService {
    String bootstrap(BootstrapAdminCommand command);
}

