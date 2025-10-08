import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { Course, Lesson, UserProgress, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      const [courseResult, lessonsResult, progressResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_number'),
        user
          ? supabase.from('user_progress').select('*').eq('user_id', user.id).eq('course_id', courseId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (courseResult.error) throw courseResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      setCourse(courseResult.data);
      setLessons(lessonsResult.data || []);
      setProgress(progressResult.data || []);
    } catch (err) {
      setError('Failed to load course details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress.some((p) => p.lesson_id === lessonId && p.completed);
  };

  const isCourseCompleted = () => {
    return progress.some((p) => p.lesson_id === null && p.completed);
  };

  const calculateProgress = () => {
    if (lessons.length === 0) return 0;
    const completedLessons = lessons.filter((lesson) => isLessonCompleted(lesson.id)).length;
    return Math.round((completedLessons / lessons.length) * 100);
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!user) return;

    const isCompleted = isLessonCompleted(lessonId);
    const existingProgress = progress.find((p) => p.lesson_id === lessonId);

    try {
      if (existingProgress) {
        const { error } = await supabase
          .from('user_progress')
          .update({
            completed: !isCompleted,
            completed_at: !isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_progress').insert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      await loadCourseData();
    } catch (err) {
      console.error('Failed to update lesson progress:', err);
    }
  };

  const markCourseCompleted = async () => {
    if (!user) return;

    const courseProgress = progress.find((p) => p.lesson_id === null);

    try {
      if (courseProgress) {
        const { error } = await supabase
          .from('user_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', courseProgress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_progress').insert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: null,
          completed: true,
          completed_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      await loadCourseData();
    } catch (err) {
      console.error('Failed to mark course as completed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Course not found'}
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress();
  const courseCompleted = isCourseCompleted();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Courses</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <BookOpen className="w-32 h-32 text-white opacity-80" />
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                {course.category}
              </span>
              {courseCompleted && (
                <span className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-slate-800 mb-4">{course.title}</h1>

            <p className="text-slate-600 text-lg mb-6 leading-relaxed">{course.description}</p>

            <div className="flex items-center space-x-6 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>{course.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>{lessons.length} lessons</span>
              </div>
              <div>
                <span className="capitalize font-medium">{course.difficulty}</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Your Progress</h3>
                <span className="text-sm font-bold text-blue-600">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Course Lessons</h2>
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const completed = isLessonCompleted(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => toggleLessonCompletion(lesson.id)}
                          className="flex-shrink-0 focus:outline-none"
                        >
                          {completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-400 hover:text-blue-600 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            Lesson {index + 1}: {lesson.title}
                          </h4>
                          {lesson.content && (
                            <p className="text-sm text-slate-600 mt-1">{lesson.content}</p>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{lesson.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={markCourseCompleted}
              disabled={courseCompleted}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all transform ${
                courseCompleted
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {courseCompleted ? 'Course Completed!' : 'Mark Course as Completed'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
