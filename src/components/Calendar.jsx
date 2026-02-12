import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useState } from 'react';

const Calendar = ({ solvedHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const renderDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-6 w-6"></div>);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}${month + 1}${d}`;
            const isSolved = solvedHistory.includes(dateStr);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            days.push(
                <div
                    key={d}
                    className={`h-6 w-6 flex items-center justify-center rounded-full text-[10px] font-medium relative cursor-default transition-colors
                    ${isToday ? 'border border-blue-500' : ''}
                    ${isSolved ? 'bg-green-600/20 text-green-400' : 'text-slate-500 hover:bg-slate-800'}
                `}
                >
                    {d}
                    {isSolved && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-900/40 rounded-full">
                            <Check size={12} className="text-green-500" />
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-slate-300">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-0.5 hover:bg-slate-700 rounded text-slate-400">
                        <ChevronLeft size={14} />
                    </button>
                    <button onClick={nextMonth} className="p-0.5 hover:bg-slate-700 rounded text-slate-400">
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-slate-600">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 place-items-center">
                {renderDays()}
            </div>
        </div>
    );
};

export default Calendar;
