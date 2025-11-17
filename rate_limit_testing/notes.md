## Rate Limit Testing 

### Goals
1. figure out how many api reqs crl api can handle per 4 min period (4 min is the the free tier vercel cron limit)
2. Use either asynch or multi-threading to make very quick requests 
3. see how many writes supabase can handle per 4 minute period 
    learn how failed operations works on postgresql and how locking the db works 



### Results
1. With synchronous python requests, the crl api returns ~150 reqs per minute 
2. using httpx it can pull 15 reqs every approx .5 seconds (we )
    at 30 hits a second 9000 accounts can be supported in the 5 second runtime
3. Running for 5 minutes uninterrupted in size 15 batches every half second -> i feel so nervous for some reason haha. 
    || result: worked perfectly fine 8985 jobs finished in 300.2ish seconds 

#### Speeding up 
1. When rate limited, only "too many requests is returned" meaning we can't reliably wait for a specific amt of time
2. it seems to handle 30 requests a second extremely well. My estimate of the fastest speed would be around 150 reqs a second 
but that is much quicker than we currently need 
3. processing 50 users takes approx 5 seconds which is approx 12 times faster than before. 
    I expect the multiple to grow with more users 
