import { useState, useEffect } from 'react';
import { Course, supabase } from '../lib/supabase';
import CourseCard from '../components/CourseCard';
import Header from '../components/Header';

interface HomeProps {
  onSelectCourse: (courseId: string) => void;
}

export default function Home({ onSelectCourse }: HomeProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Explore Our Courses
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover a wide range of courses designed to help you learn new skills and advance your career
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 text-lg">No courses available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
