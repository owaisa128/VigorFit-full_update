import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Dumbbell, Loader2 } from '../icons';

export default function WorkoutImage({ workoutId, hasImage, alt, className }) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(hasImage));

  useEffect(() => {
    if (!hasImage) {
      setImageUrl('');
      setLoading(false);
      return undefined;
    }

    let active = true;
    let objectUrl;
    setLoading(true);
    api.get(`/workouts/${workoutId}/image`, { responseType: 'blob' })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setImageUrl(objectUrl);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Load workout image failed:', error);
        if (active) {
          setImageUrl('');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [workoutId, hasImage]);

  if (!imageUrl && loading) {
    return (
      <div className="vf-workout-image-loading" role="status">
        <Loader2 size={20} aria-hidden="true" />
        <span>Loading workout cover</span>
      </div>
    );
  }
  if (!imageUrl) {
    return (
      <div className="vf-workout-image-empty" role="img" aria-label={hasImage ? 'Workout cover unavailable' : 'No workout cover added'}>
        <Dumbbell aria-hidden="true" />
        <span>{hasImage ? 'Cover unavailable' : 'No cover added'}</span>
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={(event) => {
        console.error('Workout image could not be displayed:', event.currentTarget.src);
        setImageUrl('');
      }}
    />
  );
}
