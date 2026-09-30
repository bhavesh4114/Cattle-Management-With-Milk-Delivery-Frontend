import React from 'react';
import MilkTrialsAdmin from '../../milk-admin/pages/trials/MilkTrialsAdmin';
import MilkSubscriptionsAdmin from '../../milk-admin/pages/subscriptions/MilkSubscriptionsAdmin';

const CustomerOrdersAdmin = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <MilkSubscriptionsAdmin />
            <MilkTrialsAdmin />
        </div>
    );
};

export default CustomerOrdersAdmin;
