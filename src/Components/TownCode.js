import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';

const TownCode = () => {
  const { user, token } = useAuth();
  const authToken = token || user?.token;

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const apiUrl = process.env.REACT_APP_API_URL || '';
    fetch(`${apiUrl}/codes/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch codes');
        }
        return response.json();
      })
      .then((data) => {
        setCodes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch codes');
        setLoading(false);
      });
  }, []);

  const uniqueChapters = useMemo(() => {
    const chapters = [...new Set(codes.map((code) => code.chapter).filter(Boolean))];
    return chapters.sort((a, b) => a - b);
  }, [codes]);

  const codesInChapter = useMemo(() => {
    if (!selectedChapter) return [];
    return codes.filter((code) => code.chapter === selectedChapter);
  }, [codes, selectedChapter]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  if (selectedChapter) {
    const currentIndex = uniqueChapters.indexOf(selectedChapter);
    const prevChapter = currentIndex > 0 ? uniqueChapters[currentIndex - 1] : null;
    const nextChapter = currentIndex < uniqueChapters.length - 1 ? uniqueChapters[currentIndex + 1] : null;

    return (
      <div className="bg-white shadow-lg rounded-lg max-w-4xl mx-auto my-12 p-8 font-serif">
        <button
          onClick={() => setSelectedChapter(null)}
          className="mb-8 text-indigo-600 hover:text-indigo-900"
        >
          &larr; Back to Table of Contents
        </button>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 border-b-2 pb-4">
          Chapter {selectedChapter}
        </h1>
        <div className="space-y-6">
          {codesInChapter.map((code) => (
            <div key={code.id} className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Section {code.section}: {code.name}
              </h2>
              <p className="mt-2 text-gray-600 leading-relaxed">
                {code.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-4 border-t-2 flex justify-between">
          <button
            onClick={() => setSelectedChapter(prevChapter)}
            disabled={!prevChapter}
            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            &larr; Previous Chapter
          </button>
          <button
            onClick={() => setSelectedChapter(nextChapter)}
            disabled={!nextChapter}
            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Next Chapter &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg max-w-4xl mx-auto my-12 p-8 font-serif">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-8 border-b-2 pb-4">
        Town Code
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {uniqueChapters.map((chapter) => (
          <div
            key={chapter}
            onClick={() => setSelectedChapter(chapter)}
            className="cursor-pointer group flex justify-between items-center py-2 border-b border-gray-200 hover:bg-gray-50"
          >
            <span className="text-lg text-gray-700 group-hover:text-indigo-600">
              Chapter {chapter}
            </span>
            <span className="text-lg text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 transform group-hover:translate-x-2">
              &rarr;
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TownCode;
