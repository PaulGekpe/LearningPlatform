import { Clock, BookOpen, TrendingUp } from 'lucide-react';
import { Course } from '../lib/supabase';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  };

  const difficultyColor = difficultyColors[course.difficulty as keyof typeof difficultyColors] || difficultyColors.beginner;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] transform"
    >
      <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
        <BookOpen className="w-20 h-20 text-white opacity-80" />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {course.category}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColor}`}>
            {course.difficulty}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">
          {course.title}
        </h3>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {course.description}
        </p>

        <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration_minutes} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span className="capitalize">{course.difficulty}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
