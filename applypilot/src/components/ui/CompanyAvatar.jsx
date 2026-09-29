import React from 'react';
import { CompanyIcon } from '../CompanyIcon';

export const CompanyAvatar = ({ company, logoUrl, source = 'default', size = 36, className = '' }) => {
    return (
        <CompanyIcon
            company={company}
            logoUrl={logoUrl}
            size={size}
            className={className}
        />
    );
};
