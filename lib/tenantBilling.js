function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseBillingDate(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
        return startOfDay(value);
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
        return null;
    }
    return startOfDay(parsed);
}

function addMonthsClamped(date, count) {
    const result = new Date(date.getFullYear(), date.getMonth() + count, 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(date.getDate(), lastDay));
    return result;
}

function billingAsOf(tenant, asOf) {
    const start = parseBillingDate(tenant.checkinDate);
    const today = startOfDay(asOf || new Date());
    let end = today;
    const checkout = parseBillingDate(tenant.checkoutDate);
    if (checkout && checkout < end) {
        end = checkout;
    }
    return { start, end };
}

function billingPeriods(tenant, asOf) {
    const { start, end } = billingAsOf(tenant, asOf);
    if (!start || end < start) {
        return 1;
    }

    if (tenant.rentalBasis === 'daily') {
        const days = Math.round((end - start) / 86400000);
        return days + 1;
    }

    let months = 0;
    while (addMonthsClamped(start, months + 1) <= end) {
        months += 1;
        if (months > 600) {
            break;
        }
    }
    return months + 1;
}

function calculateTenantAmountDue(tenant, asOf) {
    const rent = Number(tenant.rentAmount) || 0;
    const deposit = Number(tenant.deposit) || 0;
    const paid = Number(tenant.amountPaid) || 0;
    return billingPeriods(tenant, asOf) * rent + deposit - paid;
}

function billingSummary(tenant, asOf) {
    const periods = billingPeriods(tenant, asOf);
    if (tenant.rentalBasis === 'daily') {
        return periods === 1 ? '1 day of rent' : periods + ' days of rent';
    }
    return periods === 1 ? '1 month of rent' : periods + ' months of rent';
}

const tenantBilling = {
    billingPeriods,
    calculateTenantAmountDue,
    billingSummary
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = tenantBilling;
}
if (typeof window !== 'undefined') {
    window.tenantBilling = tenantBilling;
}
