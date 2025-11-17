## Rate Limit Testing 

### Goals
1. figure out how many api reqs crl api can handle per 4 min period (4 min is the the free tier vercel cron limit)
2. Use either asynch or multi-threading to make very quick requests 
2. see how many writes supabase can handle per 4 minute period 
    learn how failed operations works on postgresql and how locking the db works 



### Results
1. With synchronous python requests, the crl api returns ~150 reqs per minute 
