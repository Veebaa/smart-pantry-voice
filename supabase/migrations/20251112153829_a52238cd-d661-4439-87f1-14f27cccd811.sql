-- Create favorite_recipes table
CREATE TABLE public.favorite_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_name TEXT NOT NULL,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_name)
);

-- Enable RLS
ALTER TABLE public.favorite_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorite recipes"
ON public.favorite_recipes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite recipes"
ON public.favorite_recipes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite recipes"
ON public.favorite_recipes
FOR DELETE
USING (auth.uid() = user_id);