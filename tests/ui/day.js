// import dayjs from 'dayjs';

// const toDate = dayjs()
//     .subtract(1, 'day')
//     .format('YYYYMMDD');

// const frDate = dayjs()
//     .subtract(1, 'month')
//     .format('YYYYMMDD');

// const result = {
//     frDate,
//     toDate
// };

// console.log(result);
const moment = require('moment');

const toDate = moment().subtract(3, 'day'); // giữ dạng moment
const frDate = toDate.clone().subtract(4, 'month');

console.log({
    frDate: frDate.format('YYYYMMDD'),
    toDate: toDate.format('YYYYMMDD'),
});


