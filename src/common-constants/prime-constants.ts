export enum ToastSeverity {
	Success = 'success',
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
}

export enum ToastDuration {
	VeryShort = 3000,
	Short = 5000,
	Medium = 7000,
	Long = 10000,
	VeryLong = 15000,
}

/**
 * Parse 'year-month-date' string to valid Date object
 * @param dateAsYearMonthDate The prime date format
 * @returns The Date object
 */
export function dateStringToDate(dateAsYearMonthDate: string) : Date {
	// Do not convert date by new Date() sinse it's not converting by UTC, but by local time.
	const [yearString, monthString, dateString] = dateAsYearMonthDate?.split('-');
	const year = parseInt(yearString);
	// Decrease the month, since the mothes starts with 0.
	const month = parseInt(monthString) - 1;
	const date = parseInt(dateString);
	return new Date(year, month, date);
}