const DateHandler = {
    userTimezone: 0,

    Init() {
        this.userTimezone = this.GetUserTimezone()
    },

    GetUserTimezone() {
        var tz = new Date().getTimezoneOffset() / -60
        return tz
    },
    SetUserTimezone(num = null) {
        var tz = num
        if (tz === null) tz = new Date().getTimezoneOffset() / -60
        tz = parseInt(tz)

        this.userTimezone = tz
        return tz
    },

    // convert response date (timestamp mostly) to utc date
    GetUTCDate(d) {
        if (!(d instanceof Date)) {
            d = this.GetStandartString(d)
            d = new Date(d)
        }

        return new Date(d.setHours(d.getHours() + d.getTimezoneOffset() / 60))
    },

    GetCurrentUTCDate() {
        return this.GetUTCDate(new Date())
    },
    GetUserCurrentDate() {
        return this.GetUserTime(this.GetCurrentUTCDate())
    },

    // convert utc date to user date
    GetUserTime(utcDate) {
        if (!(utcDate instanceof Date)) {
            utcDate = this.GetStandartString(utcDate)
            utcDate = new Date(utcDate)
        }

        var date = utcDate
        date.setHours(date.getHours() + this.userTimezone)
        return date
    },

    // convert user date to utc date
    GetUTCTime(userDate) {
        if (!(userDate instanceof Date)) {
            userDate = this.GetStandartString(userDate)
            userDate = new Date(userDate)
        }

        var date = userDate
        date.setHours(date.getHours() - this.userTimezone)

        return date
    },

    GetDateStr(date, format = 'dd-MM-yyyy') {
        if (!(date instanceof Date)) {
            date = this.GetStandartString(date)
            date = new Date(date)
        }
        if (date === 'Invalid Date') return

        var days = ('0' + date.getDate()).slice(-2),
            month = ('0' + (date.getMonth() + 1)).slice(-2),
            year = date.getFullYear(),

            hours = ('0' + date.getHours()).slice(-2),
            minutes = ('0' + date.getMinutes()).slice(-2),
            seconds = ('0' + date.getSeconds()).slice(-2)

        if (~format.indexOf('hh')) hours = (hours + 1) % 12

        return format.replace('yyyy', year).replace('yy', String(year).slice(-2))
            .replace('MM', month).replace('dd', days)
            .replace('HH', hours).replace('hh', hours)
            .replace('mm', minutes).replace('ss', seconds)
    },
    GetShortDateStr(date) {
        if (!date) return ''
        if (!(date instanceof Date)) {
            date = this.GetStandartString(date)
            date = new Date(date)
        }
        if (date == 'Invalid Date') return ''

        var arr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        return date.getDate().toString() + ' ' + arr[date.getMonth()]
    },

    GetTimeStr(date, showSeconds = false, withoutDate = false) {
        if (!date) return ''
        if (!(date instanceof Date)) {
            date = this.GetStandartString(date)
            date = new Date(date)
        }
        if (date == 'Invalid Date') return ''

        var timeStr = ''
        if (!withoutDate) {
            timeStr = ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + ' '
        }

        timeStr += ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2)

        if (showSeconds) {
            timeStr += (':' + ('0' + date.getSeconds()).slice(-2))
        }

        return timeStr
    },

    GetStandartString(date) {
        if (typeof date !== 'string') return date
        date = date.replace(/T/g, ' ').replace(/-/g, '/').split('.')[0]
        return date
    }
}

void
function Init() {
    DateHandler.Init()
}()

window.DateHandler = DateHandler
export default DateHandler